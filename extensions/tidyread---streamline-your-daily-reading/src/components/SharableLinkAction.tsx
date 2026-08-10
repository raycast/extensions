import { Action, Detail, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { shell } from "../utils/util";
import { showFailureToast } from "@raycast/utils";
import { normalizePreference } from "../utils/preference";
import { some } from "lodash";
import { createPost, login } from "../utils/writefreely";
import { getWriteFreelyAccessToken, saveWriteFreelyAccessToken } from "../store";
import CustomActionPanel from "./CustomActionPanel";

function handleSuccess(endpoint: string, id: string) {
  shell(`open ${endpoint.replace(/\/$/, "")}/${id}`);
  showToast(Toast.Style.Success, "Generating Success");
}

export default function SharableLinkAction(props: {
  actionTitle: string;
  articleTitle: string;
  articleContent: string | (() => string);
}) {
  const { actionTitle, articleContent, articleTitle } = props;
  const { push } = useNavigation();

  return (
    <Action
      title={actionTitle}
      icon={Icon.Link}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onAction={async () => {
        const { writeFreelyEndpoint, writeFreelyAccount, writeFreelyPassword } = normalizePreference();
        if (some([writeFreelyEndpoint, writeFreelyAccount, writeFreelyPassword], (item) => !item)) {
          push(
            <Detail
              markdown={`Please press \`Enter\` to set up WriteFreely endpoint, account and password in extension preferences first.\n\nIf you don't have a WriteFreely instance, you can use [paper.wf](https://paper.wf) for free. Or use a community instance [here](https://writefreely.org/instances).\n\n💡 Check [the doc](https://www.tidyread.info/docs/share-your-digest) to learn more.`}
              actions={<CustomActionPanel />}
            />,
          );
          return;
        }

        showToast(Toast.Style.Animated, "Generating sharable link");

        const storedAccessToken = await getWriteFreelyAccessToken();
        let accessToken = storedAccessToken as string;

        if (!storedAccessToken) {
          accessToken = await login(writeFreelyAccount, writeFreelyPassword, writeFreelyEndpoint);
          await saveWriteFreelyAccessToken(accessToken);
        }

        const content = typeof articleContent === "function" ? articleContent() : articleContent;

        try {
          const resp = await createPost({
            endpoint: writeFreelyEndpoint,
            title: articleTitle,
            content,
            accessToken,
          });

          handleSuccess(writeFreelyEndpoint, resp.id);
        } catch (err: any) {
          if (err.message === "Unauthorized") {
            accessToken = await login(writeFreelyAccount, writeFreelyPassword, writeFreelyEndpoint);
            await saveWriteFreelyAccessToken(accessToken);

            const resp = await createPost({
              endpoint: writeFreelyEndpoint,
              title: articleTitle,
              content,
              accessToken,
            });

            handleSuccess(writeFreelyEndpoint, resp.id);
          } else {
            showFailureToast("Failed to generate", err.message);
          }
        }
      }}
    ></Action>
  );
}
