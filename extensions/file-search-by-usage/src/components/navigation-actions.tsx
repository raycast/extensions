import { Action, Icon } from "@raycast/api";

/** The same navigation shortcuts remain available on empty and populated lists. */
export function NavigationActions({
  onUp,
  onBack,
}: {
  onUp?: () => void;
  onBack?: () => void;
}) {
  return (
    <>
      {onUp && (
        <Action
          title="Go to Parent Folder"
          icon={Icon.ChevronLeft}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={onUp}
        />
      )}
      {onBack && (
        <Action
          title="Back to Previous Folder"
          icon={Icon.ArrowLeftCircle}
          shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
          onAction={onBack}
        />
      )}
    </>
  );
}
