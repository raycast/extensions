import { access, constants, readFile, stat } from "node:fs/promises";
import { useEffect, useState } from "react";

import { Action, ActionPanel, Form, Icon, Toast, open, popToRoot, showHUD, showToast } from "@raycast/api";

import { type CreatePlaygroundMediaType, createPlayground } from "@/api/dash/requests";
import { useOrganizations } from "@/hooks/useOrganizations";
import { wait } from "@/utils";
import { showActionToast, showFailureToast, showFailureToastWithTimeout } from "@/utils/toast";

const x = `/** @jsx h */
import html, { h } from "https://deno.land/x/htm@0.2.1/mod.ts";
Deno.serve((_req) =>
  html({
    body: (
      <div>
        <p>Hello World!</p>
      </div>
    )
  })
);
`;

const okFile = async (path: string) => {
  try {
    await access(path, constants.R_OK);
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
};

const defaultCodes: Record<CreatePlaygroundMediaType, string> = {
  ts: `Deno.serve((req: Request) => new Response('Hello World'));`,
  js: `Deno.serve((req) => new Response("Hello World"));`,
  tsx: x,
  jsx: x,
};

type CreateType = "snippet" | "file";
type FormFields = {
  media_type: CreatePlaygroundMediaType;
  code?: string;
  type: CreateType;
  file?: [string];
};

const CreatePlayground = () => {
  const { organization, otherOrganizations } = useOrganizations();
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const [mediaType, setMediaType] = useState<CreatePlaygroundMediaType>("ts");
  const [type, setType] = useState<CreateType>("snippet");

  useEffect(() => {
    if (organization) {
      setOrganizationId(organization.id);
    } else if (otherOrganizations.length > 0) {
      setOrganizationId(otherOrganizations[0].id);
    }
  }, [organization, otherOrganizations]);

  return (
    <Form
      navigationTitle={`Create Playground`}
      isLoading={!organizationId}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onSubmit={async (evt) => {
              if (!organizationId) {
                showHUD("No organization selected");
                return;
              }

              const formData = evt as unknown as FormFields;
              const mediaType = formData.media_type;

              let snippet = formData.code?.trim() || defaultCodes[formData.media_type];

              if (formData.type === "file") {
                if (!formData.file || formData.file.length !== 1) {
                  await showFailureToastWithTimeout("Error", "Please select a file to run in the playground.");
                  return;
                }
                const filePath = formData.file[0];
                if (!(await okFile(filePath))) {
                  await showFailureToastWithTimeout("Error", "Invalid file selected");
                  return;
                }
                snippet = await readFile(filePath, "utf8");
              }

              console.log(`Creating playground for ${organizationId} with ${mediaType} and ${snippet.length} bytes`);

              try {
                const abort = showActionToast({ title: "Creating playground", cancelable: true });

                const project = await createPlayground(organizationId, snippet, mediaType, {
                  signal: abort.signal,
                });

                const { name } = project;

                await open(`https://dash.deno.com/playground/${name}`);

                showToast(Toast.Style.Success, "Playground created successfully", "Playground creation");
                popToRoot();
              } catch (error) {
                await showFailureToast("Playground creation failed", error as Error);
                // Wait around until user has had chance to click the Toast action.
                // Note this only works for "no view" commands (actions still break when popping a view based command).
                // See: https://raycastapp.slack.com/archives/C01E6LWGXJ8/p1642676284027700
                await wait(3000);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="organization"
        title="Organization"
        value={organizationId || ""}
        onChange={(e) => {
          setOrganizationId(e);
        }}
      >
        {organization ? (
          <Form.Dropdown.Item title={organization.displayName} value={organization.id} icon={Icon.TwoPeople} />
        ) : null}
        {otherOrganizations.length > 0
          ? otherOrganizations.map((org) => (
              <Form.Dropdown.Item key={org.id} title={org.displayName} value={org.id} icon={Icon.TwoPeople} />
            ))
          : null}
      </Form.Dropdown>
      <Form.Dropdown
        id="media_type"
        title="Media Type"
        onChange={(e) => {
          setMediaType(e as CreatePlaygroundMediaType);
        }}
      >
        <Form.Dropdown.Item value="ts" title="TypeScript" />
        <Form.Dropdown.Item value="js" title="JavaScript" />
        <Form.Dropdown.Item value="tsx" title="TypeScript React" />
        <Form.Dropdown.Item value="jsx" title="JavaScript React" />
      </Form.Dropdown>
      <Form.Dropdown
        id="type"
        title="Type"
        onChange={(e) => {
          setType(e as CreateType);
        }}
      >
        <Form.Dropdown.Item value="snippet" title="Snippet" />
        <Form.Dropdown.Item value="file" title="File" />
      </Form.Dropdown>
      {type === "snippet" ? (
        <Form.TextArea
          id="code"
          title="Code"
          info="Code to run in the playground. Leave empty for a default example."
          placeholder={`// Leave empty for a default example\n\n${defaultCodes[mediaType]}`}
        />
      ) : (
        <Form.FilePicker
          id="file"
          title="File"
          info="Select a file to run in the playground."
          allowMultipleSelection={false}
          showHiddenFiles={true}
        />
      )}
    </Form>
  );
};

export default CreatePlayground;
