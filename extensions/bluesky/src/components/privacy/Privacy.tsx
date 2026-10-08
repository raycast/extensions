import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import {
  BlockListDetails,
  ContactBlueskyTitle,
  CreatePostFormPlaceholder,
  EmailBlueskyDetails,
  EmailBlueskySupport,
  MentionBlueskyDetails,
  MentionBlueskySupport,
  MuteListDetails,
  PrivacyNavigationTitle,
  PrivacySectionTitle,
  SendEmailAction,
  ViewBlockList,
  ViewList,
  ViewMuteList,
} from "../../utils/constants";

import Error from "../error/Error";
import NewPost from "../../new-post";
import Onboard from "../onboarding/Onboard";
import RestrictedAccountsView from "../accounts/RestrictedAccountsView";
import useStartATSession from "../../hooks/useStartATSession";

const Privacy = () => {
  const { push } = useNavigation();
  const [, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={PrivacyNavigationTitle} />
  ) : (
    <List navigationTitle={PrivacyNavigationTitle} isShowingDetail={true}>
      <List.Section title={PrivacySectionTitle}>
        <List.Item
          title={ViewMuteList}
          actions={
            <ActionPanel>
              <Action title={ViewList} onAction={() => push(<RestrictedAccountsView restrictionType="mute" />)} />
            </ActionPanel>
          }
          icon={{ source: Icon.SpeakerOff, tintColor: Color.Red }}
          detail={<List.Item.Detail markdown={MuteListDetails} />}
        />
        <List.Item
          title={ViewBlockList}
          actions={
            <ActionPanel>
              <Action title={ViewList} onAction={() => push(<RestrictedAccountsView restrictionType="block" />)} />
            </ActionPanel>
          }
          icon={{ source: Icon.MinusCircleFilled, tintColor: Color.Red }}
          detail={<List.Item.Detail markdown={BlockListDetails} />}
        />
      </List.Section>
      <List.Section title={ContactBlueskyTitle}>
        <List.Item
          title={MentionBlueskySupport}
          actions={
            <ActionPanel>
              <Action
                title={CreatePostFormPlaceholder}
                onAction={() => push(<NewPost initialPostText={`@support.bsky.team `} />)}
              />
            </ActionPanel>
          }
          icon={{ source: Icon.Bubble, tintColor: Color.Blue }}
          detail={<List.Item.Detail markdown={MentionBlueskyDetails} />}
        />
        <List.Item
          title={EmailBlueskySupport}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={SendEmailAction} url={`mailto:support@bluesky.com`} />
            </ActionPanel>
          }
          icon={{ source: Icon.Envelope, tintColor: Color.Blue }}
          detail={<List.Item.Detail markdown={EmailBlueskyDetails} />}
        />
      </List.Section>
    </List>
  );
};

export default Privacy;
