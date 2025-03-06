import { Action, ActionPanel, Color, Form, Icon, closeMainWindow, showHUD, useNavigation } from "@raycast/api";
import {
  DefaultPostCacheKey,
  NewPostTextAreaTitle,
  PostSuccessToastMessage,
  PublishText,
  Quoting,
  PostYourReply as ReplyingTo,
  ShareYourNext,
} from "./utils/constants";
import { type NewPost, PostReference } from "./types/types";
import { buildTitle, showSuccessToast } from "./utils/common";

import Error from "./components/error/Error";
import { ExtensionConfig } from "./config/config";
import HomeAction from "./components/actions/HomeAction";
import Onboard from "./components/onboarding/Onboard";
import { createPost } from "./libs/atp";
import { inspiringWords } from "./config/inspiringWords";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";
import { useEffect, useState } from "react";

interface NewPostProps {
  previousViewTitle?: string;
  initialPostText?: string;
  postReference?: PostReference;
}

const getRandomInspiringWord = () => {
  return inspiringWords[Math.floor(Math.random() * inspiringWords.length)];
};

export default function NewPost({ postReference, previousViewTitle = "", initialPostText }: NewPostProps) {
  const randomInspiringWord = getRandomInspiringWord();
  const [postText, setPostText] = useCachedState<string>(DefaultPostCacheKey, "");
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | null>();
  const { push } = useNavigation();
  const [, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  let placeHolderText = `${ShareYourNext} ${randomInspiringWord}`;

  useEffect(() => {
    if (initialPostText) {
      setTimeout(() => {
        setPostText(initialPostText);
      }, 100);
    }
  }, [initialPostText]);

  if (postReference && postReference.reason === "reply") {
    placeHolderText = `${ReplyingTo} ${postReference.replyToAuthor}: ${postReference.replyToText}`;
  }

  if (postReference && postReference.reason === "quote") {
    placeHolderText = `${Quoting} ${postReference.quotedFromAuthor}: ${postReference.originalPostText}`;
  }

  const onSubmit = async (values: NewPost) => {
    if (values.postText && values.postText.length > 0) {
      await createPost(values.postText, postReference);
      setPostText("");

      if (postReference) {
        showSuccessToast(PostSuccessToastMessage);
        pop();

        return;
      }

      showHUD(PostSuccessToastMessage);
      await closeMainWindow({ clearRootSearch: true });
    }
  };

  const onTextChange = (text: string) => {
    setPostText(text);

    if (text.length < 300) {
      setNameError(null);
    } else {
      setNameError(`${ExtensionConfig.maxPostCharacterSize} characters exceeded`);
    }
  };
  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={buildTitle(previousViewTitle, PublishText)} />
  ) : (
    <Form
      navigationTitle={buildTitle(previousViewTitle, `${postText.length} of ${ExtensionConfig.maxPostCharacterSize}`)}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={{ source: Icon.AirplaneFilled, tintColor: Color.Blue }}
            title={PublishText}
            onSubmit={onSubmit}
          />
          <HomeAction />
        </ActionPanel>
      }
    >
      <Form.TextArea
        placeholder={placeHolderText}
        id="postText"
        error={nameError ?? undefined}
        title={NewPostTextAreaTitle}
        value={postText}
        onBlur={(event) => {
          if (event.target.value && event.target.value?.length >= 300) {
            setNameError(`${ExtensionConfig.maxPostCharacterSize} characters exceeded`);
          } else {
            setNameError(undefined);
          }
        }}
        onChange={onTextChange}
      />
    </Form>
  );
}
