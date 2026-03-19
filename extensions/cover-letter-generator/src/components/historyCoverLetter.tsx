import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  closeMainWindow,
  PopToRootType,
} from "@raycast/api";
import { CoverLetterInfo } from "../type";
import { deleteCoverLetterById, deleteCoverLetterHistory } from "../util/storage";
import { useEffect, useState } from "react";
import DisplayCoverLetter from "./displayCoverLetter";

export default function CoverLetterHistory({
  data,
  isLoading = false,
}: {
  data: CoverLetterInfo[];
  isLoading?: boolean;
}) {
  const [coverLetters, setCoverLetters] = useState<CoverLetterInfo[]>(data);
  const [viewCoverLetter, setViewCoverLetter] = useState(false);

  useEffect(() => {
    setCoverLetters(data);
  }, [data]);

  async function handleDeleteCoverLetterHistory() {
    const confirmed = await confirmAlert({
      title: "Are you sure?",
      message: `Do you really want to delete all cover letters?\n This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await deleteCoverLetterHistory();
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
      showToast({ style: Toast.Style.Success, title: "Deleted", message: `All Cover Letter History removed` });
    } else {
      showToast({ style: Toast.Style.Failure, title: "Canceled", message: "Delete operation was canceled." });
    }
  }

  async function deleteSingleCoverLetter(id: string) {
    const confirmed = await confirmAlert({
      title: "Are you sure?",
      message: `Do you really want to delete this cover letter information?\n This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      const updatedCoverLetters = await deleteCoverLetterById(id);
      setCoverLetters(updatedCoverLetters);
      showToast({ style: Toast.Style.Success, title: "Deleted", message: `Cover Letter Information removed` });
    } else {
      showToast({ style: Toast.Style.Failure, title: "Canceled", message: "Delete operation was canceled." });
    }
  }

  return (
    <List isShowingDetail={true} searchBarPlaceholder="Search history..." isLoading={isLoading}>
      <List.EmptyView
        title="No Cover Letter History"
        description="Your generated cover letters will appear here."
        icon={Icon.BlankDocument}
      />
      {coverLetters.map((info) => (
        <List.Item
          key={info.pdfPath ? info.pdfPath : info._id}
          title={info.companyName + " - " + info.jobTitle}
          icon={info.pdfPath ? Icon.Document : Icon.Text} // Document icon if pdfPath exists, else TextDocument icon
          quickLook={{ path: info.pdfPath ? info.pdfPath : "" }}
          detail={
            <List.Item.Detail
              markdown={viewCoverLetter ? info.coverLetter : info.jobDescription}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Company Name" text={info.companyName} />
                  <List.Item.Detail.Metadata.Label title="Job Title" text={info.jobTitle} />
                  <List.Item.Detail.Metadata.Label
                    title="Applied Date"
                    text={new Date(parseInt(info.createdDate)).toDateString()}
                  />
                  <List.Item.Detail.Metadata.Label title="Match Score" text={info.matchScore.toString()} />
                  <List.Item.Detail.Metadata.TagList title="Top Skills">
                    {info.topSkills.map((skill) => (
                      <List.Item.Detail.Metadata.TagList.Item key={skill} text={skill} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {viewCoverLetter ? (
                <Action title="View Job Description" icon={Icon.Megaphone} onAction={() => setViewCoverLetter(false)} />
              ) : (
                <Action title="View Cover Letter" icon={Icon.Book} onAction={() => setViewCoverLetter(true)} />
              )}
              {info.pdfPath && <Action.ToggleQuickLook title="Quick Look" />}
              <Action.CopyToClipboard
                title="Copy Cover Letter"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={info.coverLetter}
              />
              <Action.Push
                title="Edit Cover Letter"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<DisplayCoverLetter data={info} edit={true} />}
              />
              {info.pdfPath && <Action.ShowInFinder path={info.pdfPath ? info.pdfPath : ""} />}
              <Action
                title="Delete Cover Letter"
                icon={Icon.Trash}
                onAction={() => deleteSingleCoverLetter(info._id)}
              />
              <Action icon={Icon.Trash} title="Delete All History" onAction={handleDeleteCoverLetterHistory} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
