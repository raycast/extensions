import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { loadOrgs } from "../../utils";
import { Dispatch, useEffect, useState } from "react";
import {
  MISC_ORGS_SECTION_LABEL,
  NEW_SECTION_LABEL,
  HEX_REGEX,
  COLOR_WARNING_MESSAGE,
  DEFAULT_COLOR,
} from "../../constants";
import { OrgListReducerAction, OrgListReducerType, DeveloperOrg, AuthenticateNewOrgFormData } from "../../types";
import { FormValidation, useForm } from "@raycast/utils";

export function DeveloperOrgDetails(props: { org: DeveloperOrg; dispatch: Dispatch<OrgListReducerAction> }) {
  const { org, dispatch } = props;
  const [section, setSection] = useState<string>();
  const [sections, setSections] = useState<string[]>([]);
  const { pop } = useNavigation();

  const setSectionValue = (section: string) => {
    setSection(section);
    setValue("section", section);
  };

  useEffect(() => {
    async function getSectionList() {
      const storedOrgs = await loadOrgs();
      const sects = new Set<string>();
      if (storedOrgs) {
        for (const org of storedOrgs!) {
          if (org.section) sects.add(org.section);
        }
        setSections([MISC_ORGS_SECTION_LABEL, ...Array.from(sects), NEW_SECTION_LABEL]);
        setSectionValue(org.section ?? MISC_ORGS_SECTION_LABEL);
      }
    }
    setValue("color", org.color ?? DEFAULT_COLOR);
    setValue("label", org.label ?? "");
    getSectionList();
  }, []);

  const title = org.label && org.label !== "" ? org.label : org.alias;

  const { handleSubmit, itemProps, setValue } = useForm<AuthenticateNewOrgFormData>({
    onSubmit(values: AuthenticateNewOrgFormData) {
      const updatedOrg = {
        ...org,
        ...values,
      };
      if (values.newSectionName) {
        updatedOrg.section = values.newSectionName;
      }
      console.log(updatedOrg);
      dispatch({
        type: OrgListReducerType.UPDATE_ORG,
        updatedOrg: updatedOrg,
      });
      pop();
    },
    validation: {
      color: (value) => {
        if (!value || !HEX_REGEX.test(value)) {
          return COLOR_WARNING_MESSAGE;
        }
      },
      section: FormValidation.Required,
      newSectionName: section === NEW_SECTION_LABEL ? FormValidation.Required : undefined,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={{ source: Icon.HardDrive }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="" text={`Update ${title}`} />
      <Form.Description title="Org URL" text={org.instanceUrl} />
      <Form.Description title="Username" text={org.username} />
      <Form.Description title="Org Alias" text={org.alias} />
      <Form.TextField title="Label" {...itemProps.label} info="Enter a label to use with your org." />
      <Form.TextField
        title="Color"
        {...itemProps.color}
        info={`Enter a color to use on the Salesforce Icon for your org. This color must be in HEX format, ie ${DEFAULT_COLOR}.`}
      />
      <Form.Dropdown
        title="Section"
        {...itemProps.section}
        onChange={setSectionValue}
        info="Select a section to group orgs on your list. If you want to create a new group, choose the 'New Section' option."
      >
        {sections.map((sect, index) => (
          <Form.Dropdown.Item key={index} value={sect} title={sect} />
        ))}
      </Form.Dropdown>
      {section === NEW_SECTION_LABEL ? (
        <Form.TextField title="New Section Name" {...itemProps.newSectionName} />
      ) : undefined}
    </Form>
  );
}
