import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getRecoveryHint,
  getUserFacingErrorMessage,
  RaycastApiError,
  type RaycastCard,
  setCardFavorite,
  softDeleteCard,
} from "../lib/api";
import {
  getCardTitle,
  getDetailStatusChips,
  getHeroMediaUrl,
  getOpenableUrl,
} from "../lib/cardDetailModel";
import { TEAK_APP_URL } from "../lib/constants";
import { formatDateTime } from "../lib/dateFormat";
import { SetApiKeyAction } from "./SetApiKeyAction";

const FAVORITE_MUTATION_DEBOUNCE_MS = 300;
const MAX_METADATA_URL_LENGTH = 64;

type FavoriteMutationState = {
  desired: boolean;
  inFlight: boolean;
  lastServer: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

export type CardDetailProps = {
  card: RaycastCard;
  onCardDeleted: (cardId: string) => void;
  onCardUpdated: (next: RaycastCard) => void;
  onFilterByTag: (tag: string) => void;
  onNavigateBackAfterDelete: () => void;
};

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
    case "aiSummary":
      return "#7C3AED";
    case "aiTags":
      return "#7C3AED";
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
}: CardDetailProps) {
  const { pop } = useNavigation();
  const [cardState, setCardState] = useState(card);
  const [isDeleting, setIsDeleting] = useState(false);
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
          const updated = await setCardFavorite(current.id, desiredValue);
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

  const handleSoftDelete = useCallback(async () => {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    const snapshot = cardStateRef.current;
    onCardDeleted(snapshot.id);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting card…",
    });

    try {
      await softDeleteCard(snapshot.id);
      toast.style = Toast.Style.Success;
      toast.title = "Card deleted";
      onNavigateBackAfterDelete();
      pop();
    } catch (error) {
      if (error instanceof RaycastApiError && error.code === "NOT_FOUND") {
        toast.style = Toast.Style.Success;
        toast.title = "Card already removed";
        onNavigateBackAfterDelete();
        pop();
        return;
      }

      onCardUpdated(snapshot);
      toast.style = Toast.Style.Failure;
      toast.title = "Delete failed";
      toast.message = toToastMessage(error);
    } finally {
      setIsDeleting(false);
    }
  }, [
    isDeleting,
    onCardDeleted,
    onCardUpdated,
    onNavigateBackAfterDelete,
    pop,
  ]);

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
    return () => {
      const mutationState = favoriteMutationRef.current;
      if (mutationState.timer) {
        clearTimeout(mutationState.timer);
      }
    };
  }, []);

  const openableUrl = getOpenableUrl(cardState);
  const metadataUrl = cardState.url
    ? truncateMiddle(cardState.url, MAX_METADATA_URL_LENGTH)
    : undefined;
  const title = getCardTitle(cardState);
  const heroMediaUrl = getHeroMediaUrl(cardState);

  const markdown = useMemo(() => {
    const sections = [
      `# ${title}`,
      "",
      heroMediaUrl ? `![](${heroMediaUrl})` : "",
      heroMediaUrl ? "" : "",
      "## Content",
      "",
      cardState.content || "_No content_",
      cardState.notes ? `\n## Notes\n\n${cardState.notes}` : "",
      cardState.aiSummary ? `\n## Teak Summary\n\n${cardState.aiSummary}` : "",
    ];

    return sections.filter(Boolean).join("\n");
  }, [
    cardState.aiSummary,
    cardState.content,
    cardState.notes,
    heroMediaUrl,
    title,
  ]);

  const statusChips = getDetailStatusChips(cardState);

  return (
    <Detail
      actions={
        <ActionPanel>
          {openableUrl ? (
            <Action.OpenInBrowser title="Open URL" url={openableUrl} />
          ) : (
            <Action.CopyToClipboard
              content={cardState.content}
              title="Copy Content"
            />
          )}
          <Action
            icon={Icon.Star}
            onAction={handleToggleFavorite}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            title={cardState.isFavorited ? "Remove Favorite" : "Add Favorite"}
          />
          <Action
            icon={Icon.Trash}
            onAction={() => {
              void handleSoftDelete();
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            style={Action.Style.Destructive}
            title={isDeleting ? "Deleting…" : "Delete"}
          />
          {openableUrl ? (
            <Action.CopyToClipboard
              content={cardState.content}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              title="Copy Content"
            />
          ) : null}
          {cardState.url ? (
            <Action.CopyToClipboard
              content={cardState.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              title="Copy URL"
            />
          ) : null}
          <Action
            icon={Icon.House}
            onAction={() => open(TEAK_APP_URL)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            title="Open Teak App"
          />
          <SetApiKeyAction />
        </ActionPanel>
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {openableUrl ? (
            <Detail.Metadata.Link
              target={openableUrl}
              text={metadataUrl ?? openableUrl}
              title="URL"
            />
          ) : cardState.url ? (
            <Detail.Metadata.Label
              text={metadataUrl ?? cardState.url}
              title="URL"
            />
          ) : null}
          {cardState.url ? <Detail.Metadata.Separator /> : null}
          <Detail.Metadata.TagList title="Status">
            {statusChips.map((chip) => (
              <Detail.Metadata.TagList.Item
                color={statusColor(chip.kind)}
                key={chip.kind}
                text={chip.text}
              />
            ))}
          </Detail.Metadata.TagList>
          {cardState.tags.length > 0 ? <Detail.Metadata.Separator /> : null}
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
          {cardState.aiTags.length > 0 ? <Detail.Metadata.Separator /> : null}
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
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            text={formatDateTime(cardState.createdAt)}
            title="Created At"
          />
          <Detail.Metadata.Label
            text={formatDateTime(cardState.updatedAt)}
            title="Updated At"
          />
        </Detail.Metadata>
      }
      navigationTitle={title}
    />
  );
}
