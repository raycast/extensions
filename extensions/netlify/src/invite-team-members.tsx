import {
  ActionPanel,
  Action,
  Form,
  Icon,
  Image,
  List,
  popToRoot,
  Toast,
  showHUD,
  showToast,
} from '@raycast/api';
import { useCachedState } from '@raycast/utils';
import { useEffect, useState } from 'react';

import api from './utils/api';
import { isValidEmail, handleNetworkError } from './utils/helpers';
import { Role, Site, Team } from './utils/interfaces';

interface FormValues {
  email: string;
  role: Role;
  site_access: 'all' | 'selected';
  site_ids: string[];
  team: string;
}

const DELIMETER = /[,\n]/;
const SAML_ENFORCED = ['enforced_strict', 'enforced_with_fallback'];

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);

  const [teams, setTeams] = useState<Team[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const [teamSlug, setTeamSlug] = useCachedState<string>('teamSlug', '');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<Role>('Owner');
  const [checked, setChecked] = useState<boolean>(true);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const [validationError, setValidationError] = useState<string>('');

  async function fetchTeams() {
    setLoading(true);
    try {
      const teams = await api.getTeams();
      setTeams(teams);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      handleNetworkError(e);
    }
  }

  async function fetchSites(query = '', team?: string) {
    setLoading(true);
    try {
      const sites = await api.getSites(query, team);
      setSites(sites);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      handleNetworkError(e);
    }
  }

  function canInvite(team: Team) {
    return (
      team.role === 'Owner' &&
      (!SAML_ENFORCED.includes(team.enforce_saml) || team.org_saml_enabled)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function validateEmail(event: any) {
    const value = (event.target?.value || '').trim() as string;
    if (!value?.length) {
      setValidationError('This field is required.');
      return false;
    }
    if (value.split(DELIMETER).length === 1) {
      if (!isValidEmail(value)) {
        setValidationError('Not a valid email.');
        return false;
      }
    } else {
      const hasAllValidEmails = value
        .split(DELIMETER)
        .every((val) => isValidEmail(val.trim()));
      if (!hasAllValidEmails) {
        setValidationError('Some of these are invalid.');
        return false;
      }
    }
    setValidationError('');
    return true;
  }

  async function handleSubmit(form: FormValues) {
    // console.log('onSubmit', form);
    const isValid = validateEmail({ target: { value: form.email } });
    if (!isValid) {
      return false;
    }

    setLoading(true);
    try {
      const site_access = form.site_access ? 'all' : 'selected';
      const promises = form.email
        .split(DELIMETER)
        .map((email) => api.addMember({ ...form, email, site_access }));
      await Promise.all(promises);
      setLoading(false);
      const s = promises.length === 1 ? '' : 's';
      showHUD(`✉️ Invitation${s} sent`);
      popToRoot();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: `Error ${error.code || 'unknown'}`,
        message: error.message || 'Something went wrong',
      });
    }
  }

  function resetFormFields() {
    setSelectedSites([]);
    setRole('Owner');
  }

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchSites('', teamSlug);
    resetFormFields();
  }, [teamSlug]);

  const invitableTeams = teams.filter(canInvite);
  const numInvites = email.trim().split(DELIMETER).filter(Boolean).length;
  const s = numInvites === 1 ? '' : 's';
  const submitButtonLabel =
    numInvites > 0 ? `Invite ${numInvites} ${role}${s}` : 'Send Invites';

  if (!isLoading && invitableTeams.length === 0) {
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
      // enableDrafts
      isLoading={isLoading}
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
        onChange={(team) => setTeamSlug(team)}
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
        id="email"
        info="New team members will get an email with a link to accept the invitation. You can enter several email addresses separated by commas or newlines."
        title="Email address(es)"
        onChange={(value) => setEmail(value)}
        error={validationError}
        onBlur={validateEmail}
      />
      <Form.Dropdown
        id="role"
        title="Role"
        info="A person’s role determines their permissions. Learn more about roles in the Netlify docs."
        onChange={(value) => setRole(value as Role)}
        value={role}
      >
        {(teams || [])
          .find(({ slug }) => slug === teamSlug)
          ?.roles_allowed.map((role) => (
            <Form.Dropdown.Item
              key={role}
              title={role === 'Controller' ? 'Billing Admin' : role}
              value={role}
            />
          ))}
      </Form.Dropdown>
      {role !== 'Owner' && (
        <Form.Checkbox
          id="site_access"
          title="What sites can they access?"
          label="All sites (including future sites)"
          value={checked}
          onChange={setChecked}
        />
      )}
      {role !== 'Owner' && !checked && (
        <Form.TagPicker
          id="sites_ids"
          info={`Select the sites that ${
            numInvites === 1 ? 'this team member' : 'these team members'
          } can access.`}
          title="Select specific sites"
          value={selectedSites}
          onChange={(values) => setSelectedSites(values)}
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
