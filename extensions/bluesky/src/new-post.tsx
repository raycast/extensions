import { Action, ActionPanel, Color, Form, Icon, useNavigation } from "@raycast/api";
import {
  DefaultPostCacheKey,
  NewPostTextAreaTitle,
  PostSuccessToastMessage,
  PublishText,
  Quoting,
  PostYourReply as ReplyingTo,
  ShareYourNext,
} from "./utils/constants";
import { NewPost, PostReference } from "./types/types";
import { buildTitle, showSuccessToast } from "./utils/common";

import Error from "./components/error/Error";
import { ExtensionConfig } from "./config/config";
import HomeAction from "./components/actions/HomeAction";
import Onboard from "./components/onboarding/Onboard";
import { createPost } from "./libs/atp";
import { inspiringWords } from "./config/inspiringWords";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "./hooks/useStartATSession";
import { useState } from "react";

interface NewPostProps {
  previousViewTitle?: string;
  postReference?: PostReference;
}

export default function NewPost({ postReference, previousViewTitle = "" }: NewPostProps) {
  const randomInspiringWord = inspiringWords[Math.floor(Math.random() * inspiringWords.length)];
  const [postText, setPostText] = useCachedState<string>(DefaultPostCacheKey, "");
  const [randomWord] = useState(randomInspiringWord);
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const { push } = useNavigation();
  const [, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  let placeHolderText = `${ShareYourNext} ${randomWord}`;

  if (postReference && postReference.reason === "reply") {
    placeHolderText = `${ReplyingTo} ${postReference.replyToAuthor}: ${postReference.replyToText}`;
  }

  if (postReference && postReference.reason === "quote") {
    placeHolderText = `${Quoting} ${postReference.quotedFromAuthor}: ${postReference.originalPostText}`;
  }

  const onSubmit = async (values: NewPost) => {
    if (values.postText && values.postText.length > 0) {
      await createPost(values.postText, postReference);
      showSuccessToast(PostSuccessToastMessage);

      if (postReference) {
        pop();
      }

      setPostText("");
    }
  };

  const onTextChange = (text: string) => {
    setPostText(text);

    if (text.length < 300) {
      setNameError(undefined);
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
        error={nameError}
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
