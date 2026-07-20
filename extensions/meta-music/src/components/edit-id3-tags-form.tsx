import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { parseError } from "@/utils/error";
import { getFileNameFromPath, normalizeFileName } from "@/utils/files";
import { readID3Tags } from "@/utils/id3";
import NodeID3 from "node-id3";
import { useState } from "react";

interface TagsForm extends Omit<NodeID3.Tags, "trackNumber" | "partOfSet" | "comment"> {
  trackNumber: string;
  allTracks: string;
  partNumber: string;
  allParts: string;
  comments: string;
}

export interface EditID3TagsProps {
  file: string;
}

export const EditID3Tags = ({ file }: EditID3TagsProps) => {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const tags = readID3Tags(file);

  const { handleSubmit, itemProps, reset } = useForm<TagsForm>({
    async onSubmit(values) {
      setIsLoading(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating tags" });

      try {
        const { trackNumber, allTracks, partNumber, allParts, comments, ...restValues } = values;

        const payload: NodeID3.Tags = {
          ...restValues,
          trackNumber: allTracks ? `${trackNumber}/${allTracks}` : trackNumber,
          partOfSet: allParts ? `${partNumber}/${allParts}` : partNumber,
          comment: comments ? { language: "eng", text: comments } : undefined,
        };

        const success = NodeID3.update(payload, file);

        if (success) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully updated tags 🎉";

          reset({
            title: "",
            artist: "",
            album: "",
            performerInfo: "",
            composer: "",
            genre: "",
            year: "",
            trackNumber: "",
            allTracks: "",
            partNumber: "",
            allParts: "",
            comments: "",
          });

          pop();
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update tags 😥";
        toast.message = parseError(error);
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      title: tags.title ?? "",
      artist: tags.artist ?? "",
      album: tags.album ?? "",
      performerInfo: tags.performerInfo ?? "",
      composer: tags.composer ?? "",
      genre: tags.genre ?? "",
      year: tags.year ?? "",
      trackNumber: tags.trackNumber?.split("/")?.[0] ?? "",
      allTracks: tags.trackNumber?.split("/")?.[1] ?? "",
      partNumber: tags.partOfSet?.split("/")?.[0] ?? "",
      allParts: tags.partOfSet?.split("/")?.[1] ?? "",
      comments: tags.comment?.text ?? "",
    },
    validation: {
      performerInfo: (value) => {
        if (value) {
          const artists = value.split("/");
          if (artists.some((artist) => artist.trim().length === 0)) {
            return "Please enter a valid artist";
          }
        }
      },
      year: isValidNumberValidation,
      trackNumber: isValidNumberValidation,
      allTracks: isValidNumberValidation,
      partNumber: isValidNumberValidation,
      allParts: isValidNumberValidation,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={normalizeFileName(getFileNameFromPath(file))}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Tags" onSubmit={handleSubmit} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Artist" placeholder="Artist" autoFocus {...itemProps.artist} />
      <Form.TextField title="Title" placeholder="Title" {...itemProps.title} />
      <Form.TextField title="Album" placeholder="Album" {...itemProps.album} />
      <Form.TextField
        title="Album Artist"
        placeholder="Album Artist"
        info="Values should be separated by a forward slash"
        {...itemProps.performerInfo}
      />
      <Form.TextField title="Composer" placeholder="Composer" {...itemProps.composer} />
      <Form.TextField title="Genre" placeholder="Genre" {...itemProps.genre} />
      <Form.TextField title="Year" placeholder="Year" {...itemProps.year} />
      <Form.TextField title="Track Number" placeholder="Track Number" {...itemProps.trackNumber} />
      <Form.TextField title="All Tracks" placeholder="All Tracks" {...itemProps.allTracks} />
      <Form.TextField title="Disc Number" placeholder="Disc Number" {...itemProps.partNumber} />
      <Form.TextField title="All Discs" placeholder="All Discs" {...itemProps.allParts} />
      <Form.TextArea title="Comments" placeholder="Comments" {...itemProps.comments} />
    </Form>
  );
};

function isValidNumberValidation(value: string | undefined) {
  if (value && isNaN(Number(value))) {
    return "Please enter a valid number";
  }
}
