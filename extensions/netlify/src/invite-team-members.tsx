import {
  ActionPanel,
  Action,
  Form,
  Icon,
  Image,
  List,
  popToRoot,
  showHUD,
} from '@raycast/api';
import { useForm, usePromise } from '@raycast/utils';
import { useEffect, useState } from 'react';

import api from './utils/api';
import { handleNetworkError, humanRole, isValidEmail } from './utils/helpers';
import { useTeams } from './utils/hooks';
import { Role, Team } from './utils/interfaces';

interface FormValues {
  email: string;
  role: string;
  site_access: boolean;
  site_ids: string[];
}

const initialValues: FormValues = {
  email: '',
  role: 'Owner',
  site_access: true,
  site_ids: [],
};
const DELIMETER = /[,\n]/;
const SAML_ENFORCED = ['enforced_strict', 'enforced_with_fallback'];

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(false);

  const { isLoadingTeams, teams, teamSlug, setTeamSlug } = useTeams({
    scoped: false,
  });

  const { data: sites = [], isLoading: isLoadingSites } = usePromise(
    async (team: string) => (await api.getSites('', team)).data,
    [teamSlug],
  );

  function canInvite(team: Team) {
    return (
      team.user_capabilities?.members?.c &&
      (!SAML_ENFORCED.includes(team.enforce_saml) || team.org_saml_enabled)
    );
  }

  async function onSubmit(form: FormValues) {
    setLoading(true);
    try {
      const role = form.role as Role;
      const site_access = form.site_access ? 'all' : 'selected';
      const promises = form.email
        .split(DELIMETER)
        .map((email) =>
          api.addMember({ ...form, email, role, site_access, team: teamSlug }),
        );
      await Promise.all(promises);
      setLoading(false);
      const s = promises.length === 1 ? '' : 's';
      showHUD(`✉️ Invitation${s} sent`);
      popToRoot();
    } catch (e) {
      setLoading(false);
      handleNetworkError(e);
    }
  }

  function validateEmail(val?: string): string {
    const value = (val || '').trim();
    if (!value?.length) {
      return 'This field is required.';
    }
    if (value.split(DELIMETER).length === 1) {
      if (!isValidEmail(value)) {
        return 'Not a valid email.';
      }
    } else {
      const hasAllValidEmails = value
        .split(DELIMETER)
        .every((v) => isValidEmail(v.trim()));
      if (!hasAllValidEmails) {
        return 'Some of these are invalid.';
      }
    }
    return '';
  }

  const { handleSubmit, itemProps, values, reset } = useForm<FormValues>({
    onSubmit,
    initialValues,
    validation: {
      email: validateEmail,
    },
  });

  useEffect(() => {
    reset(initialValues);
  }, [teamSlug]);

  const invitableTeams = teams.filter(canInvite);
  const numInvites = (values.email || '')
    .trim()
    .split(DELIMETER)
    .filter(Boolean).length;
  const s = numInvites === 1 ? '' : 's';
  const submitButtonLabel =
    numInvites > 0 ? `Invite ${numInvites} ${values.role}${s}` : 'Send Invites';

  if (!isLoadingTeams && invitableTeams.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="You're not allowed to invite team members"
          description="Sorry, you don't have sufficient permissions on your existing teams."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Create a New Team"
                url="https://app.netlify.com/teams/new"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      isLoading={isLoadingTeams || isLoadingSites || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Envelope}
            title={submitButtonLabel}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser
            icon={Icon.TwoPeople}
            shortcut={{ key: 'd', modifiers: ['cmd'] }}
            title="Learn About Roles"
            url="https://docs.netlify.com/accounts-and-billing/team-management/manage-team-members/#team-member-roles"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Netlify automatically updates your billing as you add and remove team members." />
      <Form.Dropdown
        id="team"
        info="Only team owners can invite new members. Teams with strict SAML enabled are filtered out."
        title="Add to team"
        value={teamSlug}
        onChange={setTeamSlug}
      >
        {invitableTeams
          .sort((a, b) => (a.name > b.name ? 1 : -1))
          .map((team) => (
            <Form.Dropdown.Item
              key={team.slug}
              value={team.slug}
              title={team.name}
              icon={{
                source: team.team_logo_url
                  ? team.team_logo_url
                  : 'team-placeholder.png',
                mask: Image.Mask.RoundedRectangle,
              }}
            />
          ))}
      </Form.Dropdown>
      <Form.TextArea
        autoFocus
        info="New team members will get an email with a link to accept the invitation. You can enter several email addresses separated by commas or newlines."
        title="Email address(es)"
        {...itemProps.email}
      />
      <Form.Dropdown
        title="Role"
        info="A person’s role determines their permissions. Learn more about roles in the Netlify docs."
        {...itemProps.role}
      >
        {(teams || [])
          .find(({ slug }) => slug === teamSlug)
          ?.roles_allowed.map((role) => (
            <Form.Dropdown.Item
              key={role}
              title={humanRole(role)}
              value={role}
            />
          ))}
      </Form.Dropdown>
      {teams.length > 0 && values.role !== 'Owner' && (
        <Form.Checkbox
          title="What sites can they access?"
          label="All sites (including future sites)"
          {...itemProps.site_access}
        />
      )}
      {teams.length > 0 && values.role !== 'Owner' && !values.site_access && (
        <Form.TagPicker
          info={`Select the sites that ${
            numInvites === 1 ? 'this team member' : 'these team members'
          } can access.`}
          title="Select specific sites"
          {...itemProps.site_ids}
        >
          {sites.map((site) => (
            <Form.TagPicker.Item
              key={site.id}
              value={site.id}
              title={site.name}
            />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
