import { Action, ActionPanel, Detail, environment, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { generatePDF, toCamelCase } from "../util/pdfTool";
import config = require("../config.json");
import { existsSync, mkdirSync } from "fs";
import path = require("path");
import { useState } from "react";
import { CoverLetterInfo } from "../type";
import { updateCoverLetter } from "../util/storage";
import CoverLetterHistory from "./historyCoverLetter";

export default function DisplayCoverLetter({ data, edit = false }: { data: CoverLetterInfo; edit?: boolean }) {
  const { push } = useNavigation();
  const [coverLetter, setCoverLetter] = useState(data.coverLetter);
  const [companyName, setCompanyName] = useState(data.companyName);
  const [jobTitle, setJobTitle] = useState(data.jobTitle);
  const [matchScore] = useState(data.matchScore);
  const [topSkills] = useState(data.topSkills);
  const [isEdit, setIsEdit] = useState(edit);

  async function handleGeneratePDF() {
    try {
      await showToast({ title: "Generating PDF", style: Toast.Style.Animated });
      const coverLetterPath = path.join(environment.supportPath, config.coverLetterPath, data.companyName);
      if (!existsSync(coverLetterPath)) {
        mkdirSync(coverLetterPath, { recursive: true });
      }

      const filePath =
        data.pdfPath != ""
          ? data.pdfPath
          : path.join(coverLetterPath, `${toCamelCase(data.companyName)}_${data._id}.pdf`);
      await generatePDF(coverLetter, filePath);
      const updatedInfo = { ...data, coverLetter, companyName, jobTitle, pdfPath: filePath };
      await updateCoverLetter(updatedInfo);
      await showToast({ title: "PDF Generated", style: Toast.Style.Success });
      push(<CoverLetterHistory data={[updatedInfo]} />);
    } catch (error) {
      await showToast({
        title: "Failed to Generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
    }
  }

  async function handleEditCoverLetter() {
    const updatedInfo = { ...data, coverLetter: coverLetter, companyName: companyName, jobTitle: jobTitle };
    await updateCoverLetter(updatedInfo);
    setIsEdit(false);
  }

  function formatString(input: string): string {
    return input.replace(/\[/g, "```[").replace(/\]/g, "]```");
  }

  if (isEdit) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Make Change" onSubmit={handleEditCoverLetter} />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id="coverLetter"
          title="Cover Letter"
          value={coverLetter}
          onChange={setCoverLetter}
          placeholder="Write your cover letter here..."
        />
        <Form.TextField
          id="companyName"
          title="Company Name"
          value={companyName}
          onChange={setCompanyName}
          placeholder="Enter company name"
        />
        <Form.TextField
          id="jobTitle"
          title="Job Title"
          value={jobTitle}
          onChange={setJobTitle}
          placeholder="Enter job title"
        />
      </Form>
    );
  }

  return (
    <Detail
      markdown={formatString(coverLetter)}
      actions={
        <ActionPanel>
          <Action title="Create Pdf" icon={Icon.Document} onAction={handleGeneratePDF} />
          <Action.CopyToClipboard title="Copy to Clipboard" content={coverLetter} />
          <Action
            title="Edit Cover Letter"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => setIsEdit(true)}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Company Name" text={companyName} />
          <Detail.Metadata.Label title="Job Title" text={jobTitle} />
          <Detail.Metadata.TagList title="Match Score">
            <Detail.Metadata.TagList.Item text={matchScore?.toString()} color={matchScore > 5 ? "green" : "red"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Top Skills">
            {topSkills?.map((skill: string, index: number) => (
              <Detail.Metadata.TagList.Item key={index} text={skill} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Actions">
            <Detail.Metadata.TagList.Item
              icon={Icon.Pencil}
              text="Edit Cover Letter ⌘ E"
              onAction={() => setIsEdit(true)}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
