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
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
  }, []);

  const showErrorToast = async (error = "unable to authenticate org.") => {
    await showToast({
      style: Toast.Style.Failure,
      title: error,
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

  const { handleSubmit, itemProps } = useForm<AuthenticateNewOrgFormData>({
    onSubmit(values: AuthenticateNewOrgFormData) {
      if (values.type === "sandbox") {
        values.url = "https://test.salesforce.com";
      } else if (values.type === "prod") {
        values.url = "https://login.salesforce.com";
      }
      try {
        setIsLoading(true);
        authorizeOrg(values)
          .then((fields) => {
            addOrg({
              ...fields,
              alias: values.alias,
              color: values.color,
              label: values.label,
              section: values.section === NEW_SECTION_LABEL ? values.newSectionName : values.section,
            } as DeveloperOrg);
            setIsLoading(false);
            popToRoot();
          })
          .catch((err) => {
            console.error(err);
            showErrorToast(err);
            setIsLoading(false);
          });
      } catch (err) {
        console.error(err);
        showErrorToast(err as string);
        setIsLoading(false);
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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Authenticate" icon={{ source: Icon.PlusSquare }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Add an Org"
        text="Enter the following information for your org. When you submit the form, Salesforce will prompt you to log in."
      />
      <Form.Dropdown
        info="What type of org are you logging into? If you have a custom URL, choose the 'Custom' option. "
        title="Org Type"
        {...itemProps.type}
        onChange={setOrgType}
      >
        <Form.Dropdown.Item value="sandbox" title="Sandbox" icon="🏝️" />
        <Form.Dropdown.Item value="custom" title="Custom" icon="🚀" />
        <Form.Dropdown.Item value="prod" title="Production" icon="💼" />
        <Form.Dropdown.Item value="dev" title="Developer Hub" icon="💻" />
      </Form.Dropdown>
      {orgType === "custom" ? (
        <Form.TextField
          title="Custom URL"
          {...itemProps.url}
          placeholder="https://my-custom-org.sandbox.my.salesforce.com"
        />
      ) : (
        <></>
      )}
      <Form.TextField
        info="Enter an alias for your org. This alias is used to uniquely identify your org. If you use VSCode or the SF CLI tools, this alias will also be displayed there."
        title="Org Alias"
        {...itemProps.alias}
        placeholder="my-development-org"
      />
      <Form.TextField
        info="Enter a label to use with your org."
        title="Label"
        {...itemProps.label}
        placeholder="My Org"
      />
      <Form.TextField
        info={`Enter a color to use on the Salesforce Icon for your org. This color must be in HEX format, ie ${DEFAULT_COLOR}.`}
        title="Color"
        {...itemProps.color}
        placeholder={DEFAULT_COLOR}
      />
      <Form.Dropdown
        info="Select a section to group orgs on your list. If you want to create a new group, choose the 'New Section' option."
        title="Section"
        {...itemProps.section}
        onChange={setSection}
      >
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
