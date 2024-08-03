import { Dispatch, useEffect, useState } from "react";
import { ActionPanel, Action, Form, popToRoot, Icon, showToast, Toast } from "@raycast/api";
import { authorizeOrg, loadOrgs } from "../../utils";
import {
  MISC_ORGS_SECTION_LABEL,
  NEW_SECTION_LABEL,
  HEX_REGEX,
  DEFAULT_COLOR,
  COLOR_WARNING_MESSAGE,
} from "../../constants";
import { OrgListReducerAction, OrgListReducerType, AuthenticateNewOrgFormData, DeveloperOrg } from "../../types";
import { FormValidation, useForm } from "@raycast/utils";
import { flattenOrgMap } from "../../utils";

export function AuthenticateNewOrg(props: {
  orgs?: Map<string, DeveloperOrg[]>;
  dispatch: Dispatch<OrgListReducerAction>;
}) {
  const { orgs, dispatch } = props;
  const [orgType, setOrgType] = useState<string>();
  const [section, setSection] = useState<string>();
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
    setValue("color", DEFAULT_COLOR);
  }, []);

  const showErrorToast = async () => {
    await showToast({
      style: Toast.Style.Failure,
      title: `Unable to authenticate org.`,
    });
  };

  const addOrg = async (org: DeveloperOrg) => {
    try {
      dispatch({
        type: OrgListReducerType.ADD_ORG,
        newOrg: org,
      });
    } catch (ex) {
      console.error(ex);
      showErrorToast();
    }
  };

  const { handleSubmit, itemProps, setValue } = useForm<AuthenticateNewOrgFormData>({
    onSubmit(values: AuthenticateNewOrgFormData) {
      if (values.type === "sandbox") {
        values.url = "https://test.salesforce.com";
      } else if (values.type === "prod") {
        values.url = "https://login.salesforce.com";
      }
      try {
        authorizeOrg(values)
          .then((fields) => {
            addOrg({
              ...fields,
              alias: values.alias,
              color: values.color,
              label: values.label,
              section: values.section === NEW_SECTION_LABEL ? values.newSectionName : values.section,
            } as DeveloperOrg);
            popToRoot();
          })
          .catch((err) => {
            console.error(err);
            showErrorToast();
          });
      } catch (err) {
        console.error(err);
        showErrorToast();
      }
    },
    validation: {
      alias: (value) => {
        if (!value) {
          return "This item is required";
        } else if (orgs && flattenOrgMap(orgs).find((org) => org.alias === value)) {
          return "Alias already used.";
        }
      },
      color: (value) => {
        if (!value || !HEX_REGEX.test(value)) {
          return COLOR_WARNING_MESSAGE;
        }
      },
      url: orgType === "custom" ? FormValidation.Required : undefined,
      section: FormValidation.Required,
      newSectionName: section === NEW_SECTION_LABEL ? FormValidation.Required : undefined,
      type: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Authenticate" icon={{ source: Icon.PlusSquare }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Authenticating a New Salesforce Org"
        text="Choose the org type, an org alias, and label. When you hit submit, your browser should open. "
      />
      <Form.Dropdown title="Org Type" {...itemProps.type} onChange={setOrgType}>
        <Form.Dropdown.Item value="sandbox" title="Sandbox" icon="🏝️" />
        <Form.Dropdown.Item value="custom" title="Custom" icon="🚀" />
        <Form.Dropdown.Item value="prod" title="Production" icon="💼" />
        <Form.Dropdown.Item value="dev" title="Developer Hub" icon="💻" />
      </Form.Dropdown>
      {orgType === "custom" ? <Form.TextField title="Custom URL" {...itemProps.url} /> : <></>}
      <Form.TextField title="Org Alias" {...itemProps.alias} />
      <Form.TextField title="Label" {...itemProps.label} />
      <Form.TextField title="Color (Hex Code)" {...itemProps.color} />
      <Form.Dropdown title="Section" {...itemProps.section} onChange={setSection}>
        {sections.map((sect, index) => (
          <Form.Dropdown.Item key={index} value={sect} title={sect} />
        ))}
      </Form.Dropdown>
      {section === NEW_SECTION_LABEL ? (
        <Form.TextField {...itemProps.newSectionName} title="New Section Name" />
      ) : undefined}
    </Form>
  );
}
