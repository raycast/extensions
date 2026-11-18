import { Action, ActionPanel, Color, Detail, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef } from "react";

import { buildMarkdown, buildPlainText, offerType } from "./card";
import { getFavorites, isFavoriteSecid, toggleFavorite } from "./favorites";
import { DASH, Formatter } from "./format";
import {
  fetchBond,
  fetchBondization,
  hasAmortization,
  initialFaceValue,
  moexUrl,
  nextOffer,
  smartLabUrl,
} from "./moex";
import { useLocale } from "./preferences";
import { Strings, describeError } from "./strings";
import { BondDetail as BondDetailData, Bondization } from "./types";

interface Props {
  secid: string;
  shortname: string;
  boardid: string | null;
  isin?: string | null;
  emitent?: string | null;
  onFavoritesChange?: () => void;
}

export default function BondDetailView({ secid, shortname, boardid, isin, emitent, onFavoritesChange }: Props) {
  const { fmt, t } = useLocale();
  const abortable = useRef<AbortController>(null);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (id: string, board: string | null) => {
      const signal = abortable.current?.signal;
      const [bond, bondization] = await Promise.all([fetchBond(id, board, signal), fetchBondization(id, signal)]);
      return { bond, bondization };
    },
    [secid, boardid],
    { abortable, keepPreviousData: true },
  );

  const { data: favorites, revalidate: reloadFavorites } = useCachedPromise(getFavorites, [], { initialData: [] });
  const starred = isFavoriteSecid(favorites ?? [], secid);

  const bond = data?.bond;
  const bondization = data?.bondization;

  const onToggleFavorite = useCallback(async () => {
    await toggleFavorite({
      secid,
      shortname: bond?.shortname ?? shortname,
      boardid,
      isin: bond?.isin ?? isin ?? null,
    });
    reloadFavorites();
    onFavoritesChange?.();
    await showToast({
      style: Toast.Style.Success,
      title: starred ? t.removedFromFavorites : t.addedToFavorites,
      message: bond?.shortname ?? shortname,
    });
  }, [secid, shortname, boardid, isin, bond, starred, reloadFavorites, onFavoritesChange, t]);

  if (error && !data) {
    return (
      <Detail
        markdown={`# ${t.loadFailedTitle}\n\n${describeError(error, t)}\n\n${t.loadFailedHint}`}
        actions={
          <ActionPanel>
            <Action title={t.retry} icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={bond?.shortname ?? shortname}
      markdown={bond ? buildMarkdown(bond, bondization, emitent, fmt, t) : t.loading}
      metadata={bond ? buildMetadata(bond, bondization, emitent, fmt, t) : undefined}
      actions={
        <ActionPanel>
          <Action
            title={starred ? t.removeFromFavorites : t.addToFavorites}
            icon={starred ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={onToggleFavorite}
          />
          <Action
            title={t.refresh}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <ActionPanel.Section title={t.copySection}>
            {bond?.isin ? (
              <Action.CopyToClipboard title="ISIN" content={bond.isin} shortcut={Keyboard.Shortcut.Common.Copy} />
            ) : null}
            <Action.CopyToClipboard title={t.copySecid} content={secid} />
            {bond ? (
              <Action.CopyToClipboard title={t.copyCard} content={buildPlainText(bond, bondization, emitent, fmt, t)} />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title={t.openSection}>
            <OpenLinks secid={secid} boardid={bond?.boardid ?? boardid} t={t} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function OpenLinks({ secid, boardid, t }: { secid: string; boardid: string | null; t: Strings }) {
  const moex = moexUrl(secid, boardid);
  const smartLab = smartLabUrl(secid);
  return (
    <>
      {moex ? <Action.OpenInBrowser title={t.openOnMoex} url={moex} /> : null}
      {smartLab ? <Action.OpenInBrowser title={t.openOnSmartLab} url={smartLab} /> : null}
    </>
  );
}

function buildMetadata(
  bond: BondDetailData,
  bondization: Bondization | undefined,
  emitent: string | null | undefined,
  fmt: Formatter,
  t: Strings,
) {
  const offer = nextOffer(bondization?.offers ?? []);
  const offerDate = offer?.date ?? bond.offerDate ?? bond.putOptionDate ?? bond.callOptionDate;
  const offerLabel = offerType(offer?.type);
  const amortized = hasAmortization(bondization?.amortizations ?? []);
  const face = bond.faceValue ?? bond.currentFaceValue;
  const issuedFace = initialFaceValue(bondization?.amortizations ?? []);
  const matUntil = fmt.until(bond.matDate);
  const couponUntil = fmt.until(bond.nextCoupon);
  const offerUntil = fmt.until(offerDate);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title={t.yieldToMaturity}
        text={fmt.pct(bond.yieldPct)}
        icon={bond.yieldPct === null ? undefined : { source: Icon.LineChart, tintColor: Color.Green }}
      />
      {bond.yieldToOffer !== null ? (
        <Detail.Metadata.Label title={t.yieldToOffer} text={fmt.pct(bond.yieldToOffer)} />
      ) : null}
      <Detail.Metadata.Label title={t.duration} text={fmt.duration(bond.durationDays)} />
      <Detail.Metadata.Label title={t.accruedInterest} text={fmt.money(bond.accruedInt, bond.faceUnit)} />
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title={t.coupon}
        text={`${fmt.pct(bond.couponPercent)} · ${fmt.money(bond.couponValue, bond.faceUnit)}`}
      />
      <Detail.Metadata.Label title={t.frequency} text={fmt.couponFrequency(bond.couponPeriod) ?? DASH} />
      <Detail.Metadata.Label
        title={t.nextCoupon}
        text={`${fmt.date(bond.nextCoupon)}${couponUntil ? ` · ${couponUntil}` : ""}`}
      />
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title={t.maturity} text={`${fmt.date(bond.matDate)}${matUntil ? ` · ${matUntil}` : ""}`} />
      {offerDate ? (
        <Detail.Metadata.Label
          title={offerLabel ? t.offerOf(offerLabel) : t.offer}
          text={`${fmt.date(offerDate)}${offerUntil ? ` · ${offerUntil}` : ""}`}
          icon={{ source: Icon.Alarm, tintColor: Color.Orange }}
        />
      ) : null}
      <Detail.Metadata.TagList title={t.amortization}>
        <Detail.Metadata.TagList.Item
          text={amortized ? t.amortizationYes : t.amortizationNo}
          color={amortized ? Color.Orange : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />

      <Detail.Metadata.Label
        title={t.faceValue}
        text={`${fmt.money(face, bond.faceUnit)}${
          issuedFace !== null && face !== null && issuedFace !== face
            ? ` ${t.atIssue(fmt.money(issuedFace, bond.faceUnit))}`
            : ""
        }`}
      />
      <Detail.Metadata.Label
        title={t.outstanding}
        text={
          bond.issueSizePlaced === null || face === null
            ? DASH
            : `${fmt.bigMoney(bond.issueSizePlaced * face, bond.faceUnit)} · ${fmt.loose(bond.issueSizePlaced, 0)} ${t.pieces}`
        }
      />
      <Detail.Metadata.TagList title={t.issueType}>
        {bond.bondType ? <Detail.Metadata.TagList.Item text={bond.bondType} color={Color.Blue} /> : null}
        {bond.bondSubtype ? <Detail.Metadata.TagList.Item text={bond.bondSubtype} color={Color.SecondaryText} /> : null}
        <Detail.Metadata.TagList.Item
          text={fmt.listLevel(bond.listLevel)}
          color={bond.listLevel === 3 ? Color.Orange : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />

      {emitent ? <Detail.Metadata.Label title={t.issuer} text={emitent} /> : null}
      <Detail.Metadata.Label title={t.isin} text={bond.isin ?? DASH} />
      <Detail.Metadata.Label title={t.securityCode} text={bond.secid} />
      <Detail.Metadata.Label title={t.board} text={bond.boardName ?? bond.boardid ?? DASH} />
    </Detail.Metadata>
  );
}
