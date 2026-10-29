import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCardById,
  getRecoveryHint,
  getUserFacingErrorMessage,
  RaycastApiError,
  type RaycastCard,
  setCardFavorite,
} from "../lib/api";
import {
  formatFileSize,
  formatLinkCategory,
  formatLinkPrice,
  getCardDomain,
  getCardSource,
  getCardTitle,
  getDetailMarkdown,
  getDetailStatusChips,
  getLinkByline,
  getLinkPublishedDate,
  getOpenableUrl,
  getTeakUrl,
} from "../lib/cardDetailModel";
import { formatDate, formatDateTime } from "../lib/dateFormat";
import { doneStatusLabel, isDone } from "../lib/doneStates";
import {
  deleteCardForever,
  moveCardToTrash,
  restoreFromTrash,
} from "../lib/trashActions";
import { AccountActions } from "./AccountActions";
import { CardCopyActions, CardOrganizeActions } from "./CardOrganizeActions";
import { getCardSavedAt } from "./cardListItem";
import { EditCardForm } from "./EditCardForm";

const FAVORITE_MUTATION_DEBOUNCE_MS = 300;
const MAX_METADATA_URL_LENGTH = 64;

interface FavoriteMutationState {
  desired: boolean;
  inFlight: boolean;
  lastServer: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface CardDetailProps {
  card: RaycastCard;
  onCardDeleted: (cardId: string) => void;
  onCardUpdated: (next: RaycastCard) => void;
  onFilterByTag: (tag: string) => void;
  onNavigateBackAfterDelete: () => void;
  /** Lets the list behind this card check its sign-in again. */
  onSignedOut?: () => void;
}

const truncateMiddle = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  const prefixLength = Math.ceil((maxLength - 1) / 2);
  const suffixLength = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, prefixLength)}…${value.slice(-suffixLength)}`;
};

const toToastMessage = (error: unknown): string => {
  const hint = getRecoveryHint(error);
  return hint
    ? `${getUserFacingErrorMessage(error)} ${hint}`
    : getUserFacingErrorMessage(error);
};

const statusColor = (
  kind: ReturnType<typeof getDetailStatusChips>[number]["kind"],
): string => {
  switch (kind) {
    case "type":
      return "#2563EB";
    case "favorite":
      return "#D97706";
    case "done":
      return "#16A34A";
    default:
      return "#6B7280";
  }
};

export function CardDetail({
  card,
  onCardDeleted,
  onCardUpdated,
  onFilterByTag,
  onNavigateBackAfterDelete,
  onSignedOut,
}: CardDetailProps) {
  const { pop } = useNavigation();
  const [cardState, setCardState] = useState(card);
  const [isDeleting, setIsDeleting] = useState(false);
  // A list holds cards without their `[[` links; the single-card read has them.
  const [linkRefs, setLinkRefs] = useState<
    Pick<RaycastCard, "backlinks" | "links">
  >({ backlinks: card.backlinks, links: card.links });
  const cardStateRef = useRef(card);
  const favoriteMutationRef = useRef<FavoriteMutationState>({
    desired: card.isFavorited,
    inFlight: false,
    lastServer: card.isFavorited,
    timer: null,
  });

  const emitCardUpdate = useCallback(
    (next: RaycastCard) => {
      cardStateRef.current = next;
      setCardState(next);
      onCardUpdated(next);
    },
    [onCardUpdated],
  );

  const patchFavorite = useCallback(
    (isFavorited: boolean) => {
      setCardState((previous) => {
        if (previous.isFavorited === isFavorited) {
          return previous;
        }

        const next = { ...previous, isFavorited };
        cardStateRef.current = next;
        onCardUpdated(next);
        return next;
      });
    },
    [onCardUpdated],
  );

  const flushFavoriteCommit = useCallback(async () => {
    const mutationState = favoriteMutationRef.current;
    if (mutationState.inFlight) {
      return;
    }

    mutationState.inFlight = true;

    try {
      while (mutationState.desired !== mutationState.lastServer) {
        const current = cardStateRef.current;
        const desiredValue = mutationState.desired;

        try {
          const updated = await setCardFavorite(
            current.id,
            desiredValue,
            "interactive",
          );
          mutationState.lastServer = updated.isFavorited;
          emitCardUpdate(updated);
        } catch (error) {
          if (error instanceof RaycastApiError && error.code === "NOT_FOUND") {
            onCardDeleted(current.id);
            await showToast({
              style: Toast.Style.Failure,
              title: "Card no longer exists",
              message: "It was removed from your list.",
            });
            pop();
            return;
          }

          mutationState.desired = mutationState.lastServer;
          patchFavorite(mutationState.lastServer);
          await showToast({
            style: Toast.Style.Failure,
            title: "Favorite update failed",
            message: toToastMessage(error),
          });
          return;
        }
      }
    } finally {
      mutationState.inFlight = false;
    }
  }, [emitCardUpdate, onCardDeleted, patchFavorite, pop]);

  const queueFavoriteCommit = useCallback(
    (nextValue: boolean) => {
      const mutationState = favoriteMutationRef.current;
      mutationState.desired = nextValue;

      if (mutationState.timer) {
        clearTimeout(mutationState.timer);
      }

      mutationState.timer = setTimeout(() => {
        mutationState.timer = null;
        void flushFavoriteCommit();
      }, FAVORITE_MUTATION_DEBOUNCE_MS);
    },
    [flushFavoriteCommit],
  );

  const handleToggleFavorite = useCallback(() => {
    const nextValue = !cardStateRef.current.isFavorited;
    patchFavorite(nextValue);
    queueFavoriteCommit(nextValue);
  }, [patchFavorite, queueFavoriteCommit]);

  const leaveDetail = useCallback(() => {
    onNavigateBackAfterDelete();
    pop();
  }, [onNavigateBackAfterDelete, pop]);

  const handleMoveToTrash = useCallback(async () => {
    if (isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      const moved = await moveCardToTrash(cardStateRef.current, {
        onRemoved: onCardDeleted,
        onRestored: onCardUpdated,
      });
      if (moved) {
        leaveDetail();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, leaveDetail, onCardDeleted, onCardUpdated]);

  const handleRestore = useCallback(async () => {
    if (await restoreFromTrash(cardStateRef.current, onCardDeleted)) {
      leaveDetail();
    }
  }, [leaveDetail, onCardDeleted]);

  const handleDeleteForever = useCallback(async () => {
    if (await deleteCardForever(cardStateRef.current, onCardDeleted)) {
      leaveDetail();
    }
  }, [leaveDetail, onCardDeleted]);

  const handleTagAction = useCallback(
    (tag: string) => {
      onFilterByTag(tag);
      pop();
    },
    [onFilterByTag, pop],
  );

  useEffect(() => {
    cardStateRef.current = card;
    setCardState(card);
    const mutationState = favoriteMutationRef.current;

    if (mutationState.timer) {
      clearTimeout(mutationState.timer);
    }

    favoriteMutationRef.current = {
      desired: card.isFavorited,
      inFlight: false,
      lastServer: card.isFavorited,
      timer: null,
    };
  }, [card.id, card]);

  useEffect(() => {
    let isMounted = true;
    getCardById(card.id, "interactive")
      .then((full) => {
        if (isMounted) {
          setLinkRefs({ backlinks: full.backlinks, links: full.links });
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [card.id]);

  useEffect(
    () => () => {
      const mutationState = favoriteMutationRef.current;
      if (mutationState.timer) {
        clearTimeout(mutationState.timer);
      }
    },
    [],
  );

  const openableUrl = getOpenableUrl(cardState);
  const domain = getCardDomain(cardState);
  const metadataUrl = cardState.url
    ? truncateMiddle(cardState.url, MAX_METADATA_URL_LENGTH)
    : undefined;
  const title = getCardTitle(cardState);
  const markdown = useMemo(
    () =>
      getDetailMarkdown({
        ...cardState,
        backlinks: cardState.backlinks ?? linkRefs.backlinks,
        links: cardState.links ?? linkRefs.links,
      }),
    [cardState, linkRefs],
  );
  const byline = getLinkByline(cardState);
  const publishedDate = getLinkPublishedDate(cardState);
  const source = getCardSource(cardState);
  const inTrash = Boolean(cardState.isDeleted);
  const colors = cardState.colors ?? [];
  const linkFacts = cardState.linkFacts ?? [];

  const statusChips = getDetailStatusChips(cardState);
  const hasSourceFacts = Boolean(
    cardState.url ||
    cardState.fileName ||
    cardState.linkCategory ||
    cardState.linkPrice ||
    byline ||
    publishedDate ||
    source ||
    linkFacts.length > 0,
  );

  const urlMetadataFallback = cardState.url ? (
    <Detail.Metadata.Label text={metadataUrl ?? cardState.url} title="URL" />
  ) : null;

  return (
    <Detail
      actions={
        <ActionPanel title={getCardTitle(cardState, 40)}>
          <ActionPanel.Section>
            {openableUrl ? (
              <Action.OpenInBrowser title="Open URL" url={openableUrl} />
            ) : null}
            {cardState.fileUrl ? (
              <Action.OpenInBrowser
                icon={Icon.Paperclip}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
                title="Open File"
                url={cardState.fileUrl}
              />
            ) : null}
            <Action.OpenInBrowser
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
              title="Open in Teak"
              url={getTeakUrl(cardState)}
            />
          </ActionPanel.Section>
          {inTrash ? (
            <ActionPanel.Section title="Trash">
              <Action
                icon={Icon.ArrowCounterClockwise}
                onAction={() => void handleRestore()}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                title="Restore"
              />
              <Action
                icon={Icon.Trash}
                onAction={() => void handleDeleteForever()}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                title="Delete Forever"
              />
            </ActionPanel.Section>
          ) : (
            <CardOrganizeActions
              card={cardState}
              onCardUpdated={emitCardUpdate}
            >
              <Action
                icon={cardState.isFavorited ? Icon.StarDisabled : Icon.Star}
                onAction={handleToggleFavorite}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                title={cardState.isFavorited ? "Unfavorite" : "Favorite"}
              />
              <Action.Push
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <EditCardForm
                    card={cardState}
                    onCardUpdated={emitCardUpdate}
                  />
                }
                title="Edit Card"
              />
            </CardOrganizeActions>
          )}
          <CardCopyActions card={cardState}>
            {colors.length > 0 ? (
              <ActionPanel.Submenu icon={Icon.Swatch} title="Copy Color">
                {colors.map((color) => (
                  <Action.CopyToClipboard
                    content={color.hex}
                    icon={{ source: Icon.CircleFilled, tintColor: color.hex }}
                    key={color.hex}
                    title={
                      color.name ? `${color.name} ${color.hex}` : color.hex
                    }
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
          </CardCopyActions>
          {inTrash ? null : (
            <ActionPanel.Section>
              <Action
                icon={Icon.Trash}
                onAction={() => void handleMoveToTrash()}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                title={isDeleting ? "Moving to Trash…" : "Move to Trash"}
              />
            </ActionPanel.Section>
          )}
          <AccountActions
            onSignedOut={() => {
              onSignedOut?.();
              pop();
            }}
          />
        </ActionPanel>
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            {statusChips.map((chip) => (
              <Detail.Metadata.TagList.Item
                color={statusColor(chip.kind)}
                key={chip.kind}
                text={chip.text}
              />
            ))}
          </Detail.Metadata.TagList>
          {cardState.tags.length > 0 ? (
            <Detail.Metadata.TagList title="Tags">
              {cardState.tags.map((tag) => (
                <Detail.Metadata.TagList.Item
                  key={`tag-${tag}`}
                  onAction={() => {
                    handleTagAction(tag);
                  }}
                  text={tag}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {cardState.aiTags.length > 0 ? (
            <Detail.Metadata.TagList title="AI Tags">
              {cardState.aiTags.map((tag) => (
                <Detail.Metadata.TagList.Item
                  key={`ai-tag-${tag}`}
                  onAction={() => {
                    handleTagAction(tag);
                  }}
                  text={tag}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {colors.length > 0 ? (
            <Detail.Metadata.TagList title="Colors">
              {colors.map((color) => (
                <Detail.Metadata.TagList.Item
                  color={color.hex}
                  key={`color-${color.hex}`}
                  text={color.hex}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {isDone(cardState) && typeof cardState.completedAt === "number" ? (
            <Detail.Metadata.Label
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              text={formatDateTime(cardState.completedAt)}
              title={doneStatusLabel(cardState)}
            />
          ) : null}
          {hasSourceFacts ? <Detail.Metadata.Separator /> : null}
          {openableUrl ? (
            <Detail.Metadata.Link
              target={openableUrl}
              text={metadataUrl ?? openableUrl}
              title="URL"
            />
          ) : (
            urlMetadataFallback
          )}
          {domain ? <Detail.Metadata.Label text={domain} title="Site" /> : null}
          {cardState.fileName ? (
            <Detail.Metadata.Label
              icon={Icon.Paperclip}
              text={
                cardState.fileSize
                  ? `${cardState.fileName} · ${formatFileSize(cardState.fileSize)}`
                  : cardState.fileName
              }
              title="File"
            />
          ) : null}
          {cardState.linkCategory ? (
            <Detail.Metadata.Label
              text={formatLinkCategory(cardState.linkCategory)}
              title="Category"
            />
          ) : null}
          {cardState.linkPrice ? (
            <Detail.Metadata.Label
              icon={Icon.Coins}
              text={formatLinkPrice(cardState.linkPrice)}
              title="Price"
            />
          ) : null}
          {byline ? (
            <Detail.Metadata.Label text={byline} title="Byline" />
          ) : null}
          {publishedDate ? (
            <Detail.Metadata.Label
              text={formatDate(publishedDate.getTime())}
              title="Published"
            />
          ) : null}
          {source ? (
            <Detail.Metadata.Link
              target={source.url}
              text={source.label}
              title="Saved From"
            />
          ) : null}
          {linkFacts.map((fact) => (
            <Detail.Metadata.Label
              key={`fact-${fact.label}`}
              text={fact.value}
              title={fact.label}
            />
          ))}
          <Detail.Metadata.Separator />
          {inTrash ? (
            <Detail.Metadata.Label
              icon={Icon.Trash}
              text="Teak empties Trash after 30 days"
              title="In Trash"
            />
          ) : null}
          <Detail.Metadata.Label
            text={formatDateTime(getCardSavedAt(cardState))}
            title="Saved"
          />
          {cardState.updatedAt > getCardSavedAt(cardState) ? (
            <Detail.Metadata.Label
              text={formatDateTime(cardState.updatedAt)}
              title="Updated"
            />
          ) : null}
        </Detail.Metadata>
      }
      navigationTitle={title}
    />
  );
}
