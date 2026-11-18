import type { ComponentProps } from "react";
import { Color, Icon, Image, List } from "@raycast/api";
import type { FavoriteKind } from "../lib/favorites";

export interface EntityRowProps {
  kind: FavoriteKind;
  id: string;
  name: string;
  imageUrl?: string | null;
  subtitle?: string | null;
  /** On Cosign (people) / verified (companies). */
  verified?: boolean;
  starred?: boolean;
  keywords?: string[];
  detail?: ComponentProps<typeof List.Item>["detail"];
  actions?: ComponentProps<typeof List.Item>["actions"];
}

export function entityIcon(kind: FavoriteKind, imageUrl?: string | null): Image.ImageLike {
  if (kind === "people") return { source: imageUrl ?? Icon.Person, mask: Image.Mask.RoundedRectangle };
  return imageUrl ?? Icon.Building;
}

export function EntityRow(props: EntityRowProps) {
  const { kind, id, name, imageUrl, subtitle, verified, starred, keywords, detail, actions } = props;
  return (
    <List.Item
      id={id}
      icon={entityIcon(kind, imageUrl)}
      title={name}
      subtitle={subtitle ?? undefined}
      keywords={keywords}
      accessories={[
        ...(starred ? [{ icon: Icon.Star, tooltip: "Favorite" }] : []),
        ...(verified
          ? [
              kind === "people"
                ? { icon: { source: "on-cosign.svg", tintColor: Color.PrimaryText }, tooltip: "On Cosign" }
                : { icon: Icon.CheckCircle, tooltip: "Verified" },
            ]
          : []),
      ]}
      detail={detail}
      actions={actions}
    />
  );
}
