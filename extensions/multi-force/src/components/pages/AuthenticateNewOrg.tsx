import { Dispatch, useEffect, useState } from "react";
import { ActionPanel, Action, Form, popToRoot, Icon, showToast, Toast } from "@raycast/api";
import { authorizeOrg, loadOrgs } from "../../utils";
import {
  MISC_ORGS_SECTION_LABEL,
  NEW_SECTION_LABEL,
  HEX_REGEX,
  DEFAULT_COLOR,
  COLOR_WARNING_MESSAGE,
  PATH_OPTIONS,
  CUSTOM_KEY,
  ADD_AN_ORG_LABEL,
  ADD_AN_ORG_DESCRIPTION,
  ORG_TYPE_LABEL,
  ORG_TYPE_DESCRIPTION,
  CUSTOM_LOGIN_URL_LABEL,
  CUSTOM_LOGIN_URL_PLACEHOLDER,
  CUSTOM_LOGIN_URL_DESCRIPTION,
  ORG_ALIAS_LABEL,
  ORG_ALIAS_DESCRIPTION,
  ORG_ALIAS_PLACEHOLDER,
  ORG_LABEL_DESCRIPTION,
  ORG_LABEL_LABEL,
  ORG_LABEL_PLACEHOLDER,
  COLOR_DESCRIPTION,
  COLOR_LABEL,
  OPEN_TO_DESCRIPTION,
  OPEN_TO_LABEL,
  CUSTOM_PATH_LABEL,
  CUSTOM_PATH_DESCRIPTION,
  CUSTOM_PATH_PLACEHOLDER,
  SECTION_DESCRIPTION,
  SECTION_LABEL,
  NEW_SECTION_NAME_LABEL,
  NEW_SECTION_DESCRIPTION,
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
  const [path, setPath] = useState<string>();
  const [sections, setSections] = useState<string[]>([]);

  useEffect(() => {
    async function getSectionList() {
      const storedOrgs = await loadOrgs();
      const sects = new Set<string>();
      if (storedOrgs) {
        for (const org of storedOrgs!) {
          if (org.section) sects.add(org.section);
        }
        const sectionNames = [...new Set([MISC_ORGS_SECTION_LABEL, ...Array.from(sects), NEW_SECTION_LABEL])];
        setSections(sectionNames);
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
              openToPath: values.openToPath === CUSTOM_KEY ? values.customPath : values.openToPath,
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
      openToPath: FormValidation.Required,
      customPath: (value) => {
        if (path === CUSTOM_KEY) {
          if (!value) {
            return "This item is required";
          } else if (value.charAt(0) !== "/") {
            return "Only relative paths are allowed. Make sure your path starts with '/'.";
          }
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" icon={{ source: Icon.PlusSquare }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title={ADD_AN_ORG_LABEL} text={ADD_AN_ORG_DESCRIPTION} />
      <Form.Dropdown info={ORG_TYPE_DESCRIPTION} title={ORG_TYPE_LABEL} {...itemProps.type} onChange={setOrgType}>
        <Form.Dropdown.Item value="sandbox" title="Sandbox" icon="🏝️" />
        <Form.Dropdown.Item value="custom" title="Custom" icon="🚀" />
        <Form.Dropdown.Item value="prod" title="Production" icon="💼" />
        <Form.Dropdown.Item value="dev" title="Developer Hub" icon="💻" />
      </Form.Dropdown>
      {orgType === "custom" ? (
        <Form.TextField
          title={CUSTOM_LOGIN_URL_LABEL}
          {...itemProps.url}
          placeholder={CUSTOM_LOGIN_URL_PLACEHOLDER}
          info={CUSTOM_LOGIN_URL_DESCRIPTION}
        />
      ) : (
        <></>
      )}
      <Form.TextField
        info={ORG_ALIAS_DESCRIPTION}
        title={ORG_ALIAS_LABEL}
        {...itemProps.alias}
        placeholder={ORG_ALIAS_PLACEHOLDER}
      />
      <Form.TextField
        info={ORG_LABEL_DESCRIPTION}
        title={ORG_LABEL_LABEL}
        {...itemProps.label}
        placeholder={ORG_LABEL_PLACEHOLDER}
      />
      <Form.TextField info={COLOR_DESCRIPTION} title={COLOR_LABEL} {...itemProps.color} placeholder={DEFAULT_COLOR} />
      <Form.Dropdown info={OPEN_TO_DESCRIPTION} title={OPEN_TO_LABEL} {...itemProps.openToPath} onChange={setPath}>
        {PATH_OPTIONS.map((pathOption, index) => (
          <Form.Dropdown.Item key={index} value={pathOption.value} title={pathOption.key} />
        ))}
      </Form.Dropdown>
      {path === CUSTOM_KEY ? (
        <Form.TextField
          {...itemProps.customPath}
          title={CUSTOM_PATH_LABEL}
          info={CUSTOM_PATH_DESCRIPTION}
          placeholder={CUSTOM_PATH_PLACEHOLDER}
        />
      ) : undefined}
      <Form.Dropdown info={SECTION_DESCRIPTION} title={SECTION_LABEL} {...itemProps.section} onChange={setSection}>
        {sections.map((sect, index) => (
          <Form.Dropdown.Item key={index} value={sect} title={sect} />
        ))}
      </Form.Dropdown>
      {section === NEW_SECTION_LABEL ? (
        <Form.TextField {...itemProps.newSectionName} title={NEW_SECTION_NAME_LABEL} info={NEW_SECTION_DESCRIPTION} />
      ) : undefined}
    </Form>
  );
}
