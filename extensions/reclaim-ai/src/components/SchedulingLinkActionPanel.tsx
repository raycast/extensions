import { Action, ActionPanel, Icon } from "@raycast/api";
import { useMemo, type FC } from "react";
import { SchedulingLink } from "../types/scheduling-link";
import { useUser } from "../hooks/useUser";
import { useSchedulingLinkActions } from "../hooks/useSchedulingLinks";

export type SchedulingLinkActionPanelProps = { link: SchedulingLink };

export const SchedulingLinkActionPanel: FC<SchedulingLinkActionPanelProps> = ({ link }) => {
  /********************/
  /*   custom hooks   */
  /********************/

  const { currentUser } = useUser();
  const { createOneOffLink, createShareLink } = useSchedulingLinkActions(link);

  /********************/
  /*     useState     */
  /********************/

  /********************/
  /* useMemo & consts */
  /********************/

  const url = `https://app.reclaim.ai/m/${link.pageSlug}/${link.slug}`;

  const shareTimesEnabled = useMemo(() => {
    return !!currentUser?.features.schedulingLinks.shareTimesEnabled;
  }, [currentUser]);

  /********************/
  /*    useCallback   */
  /********************/

  /********************/
  /*    useEffects    */
  /********************/

  /********************/
  /*       JSX        */
  /********************/

  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Link to Clipboard" content={url} />
      {shareTimesEnabled && <Action icon={Icon.AddPerson} title="Personalize and Share" onAction={createShareLink} />}
      {/* eslint-disable-next-line @raycast/prefer-title-case */}
      {!shareTimesEnabled && <Action icon={Icon.AddPerson} title="Create One Off Link" onAction={createOneOffLink} />}
      <Action.Open title="Open in Browser" target={url} />
    </ActionPanel>
  );
};
