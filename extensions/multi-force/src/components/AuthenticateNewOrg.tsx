import { useEffect, useState } from "react";
import { ActionPanel, Action, Form, popToRoot } from "@raycast/api";
import { AuthenticateNewOrgFormData, DeveloperOrg } from "../models/models";
import { authorizeOrg } from "../utils/sf";
import { loadOrgs, saveOrgs } from "../utils/storage-management";
import { MISC_ORGS_SECTION_LABEL, NEW_SECTION_LABEL } from "../utils/constants";

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{4})$/;

export function AuthenticateNewOrg(props: { callback: () => Promise<void> }) {
  const [orgType, setOrgType] = useState<string>();
  const [section, setSection] = useState<string>();
  const [showNewSelection, setShowNewSelection] = useState<boolean>(false);
  const [showNewSelectionError, setShowNewSelectionError] = useState<string>();
  const [aliasError, setAliasError] = useState<string>();
  const [colorError, setShowColorError] = useState<string>();
  const [sections, setSections] = useState<string[]>([]);

  useEffect(() => {
    async function getSectionList() {
      const storedOrgs = await loadOrgs();
      const sects = new Set<string>();
      if (storedOrgs) {
        for (const org of storedOrgs!) {
          if (org.section) sects.add(org.section);
        }
        console.log("FOUND SECTIONS: " + (Array.from(sects) as string[]));
        setSections([MISC_ORGS_SECTION_LABEL, ...Array.from(sects), NEW_SECTION_LABEL]);
        setSection(MISC_ORGS_SECTION_LABEL);
      }
    }
    getSectionList();
  }, []);

  const addOrg = async (org: DeveloperOrg) => {
    console.log("Added Org");
    try {
      const storedOrgs = await loadOrgs();
      storedOrgs!.push(org);
      storedOrgs!.sort((a, b) => a.alias.localeCompare(b.alias));
      saveOrgs(storedOrgs!);
      props.callback();
    } catch (ex) {
      console.error(ex);
    }
  };

  const handleSectionChange = async (sect: string) => {
    if (sect !== "New Section") {
      setShowNewSelection(false);
      setSection(sect);
    } else {
      setSection(sect);
      setShowNewSelection(true);
    }
  };

  const createNewSection = async (sect: string) => {
    if (sect) {
      setShowNewSelectionError(undefined);
    } else {
      setShowNewSelectionError("Please enter a section name.");
    }
  };

  const dismissAliasError = () => {
    if (aliasError) setAliasError(undefined);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: AuthenticateNewOrgFormData) => {
              console.log(values);
              if (values.type === "sandbox") {
                values.url = "https://test.salesforce.com";
              } else if (values.type === "prod") {
                values.url = "https://login.salesforce.com";
              }
              if (!values.alias?.trim()) {
                setAliasError("Alias is required");
              } else {
                setAliasError(undefined);
              }
              if (values.section === "New Section" && !values.newSectionName) {
                //Set newSectionNameError
                setShowNewSelectionError("New Section Name is required");
              } else {
                setShowNewSelectionError(undefined);
              }
              if (!values.color || !HEX_REGEX.test(values.color)) {
                //Set colorError
                setShowColorError("A valid HEX color is required");
              } else {
                setShowColorError(undefined);
              }
              if (
                (values.url || values.type === "dev") &&
                values.alias &&
                values.color &&
                (values.section !== "New Section" || values.newSectionName)
              ) {
                authorizeOrg(values).then((fields) => {
                  addOrg({
                    ...fields,
                    alias: values.alias,
                    color: values.color,
                    label: values.label,
                    section: values.section === NEW_SECTION_LABEL ? values.newSectionName : values.section,
                  } as DeveloperOrg);
                  popToRoot();
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Authenticating a New Salesforce Org"
        text="Choose the org type, an org alias, and label. When you hit submit, your browser should open. "
      />
      <Form.Dropdown id="type" title="Org Type" onChange={(option) => setOrgType(option)}>
        <Form.Dropdown.Item value="sandbox" title="Sandbox" icon="🏝️" />
        <Form.Dropdown.Item value="custom" title="Custom" icon="🚀" />
        <Form.Dropdown.Item value="prod" title="Production" icon="💼" />
        <Form.Dropdown.Item value="dev" title="Developer Hub" icon="💻" />
      </Form.Dropdown>
      {orgType === "custom" ? <Form.TextField id="url" title="Custom URL" defaultValue="" /> : <></>}
      <Form.TextField id="alias" title="Org Alias" error={aliasError} onChange={dismissAliasError} />
      <Form.TextField id="label" title="Label" />
      <Form.TextField id="color" title="Color (Hex Code)" defaultValue="#0000FF" error={colorError} />
      <Form.Dropdown id="section" title="Section" defaultValue={section} onChange={handleSectionChange}>
        {sections.map((sect, index) => (
          <Form.Dropdown.Item key={index} value={sect} title={sect} />
        ))}
      </Form.Dropdown>
      {showNewSelection ? (
        <Form.TextField
          id="newSectionName"
          error={showNewSelectionError}
          title="New Section Name"
          onChange={createNewSection}
        />
      ) : undefined}
    </Form>
  );
}
