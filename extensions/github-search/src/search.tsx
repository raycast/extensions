import { useState } from 'react';
import { Form, ActionPanel, Action, open, getDefaultApplication, useNavigation, showToast, Icon, Toast, Keyboard } from '@raycast/api';
import { focusOrOpenUrl, isSupportBrowser } from './open-url';
import { useLocalStorage } from '@raycast/utils';
import type { FormFields, ReusableFilter, ReusableFilterFormProps, SavedSearch } from './types';

const FILTER_OPTIONS = [
  { id: 'code', title: 'Code' },
  { id: 'repositories', title: 'Repositories' },
  { id: 'issues', title: 'Issues' },
  { id: 'pullrequests', title: 'Pull Requests' },
  { id: 'discussions', title: 'Discussions' },
  { id: 'users', title: 'Users' },
  { id: 'commits', title: 'Commits' },
  { id: 'registrypackages', title: 'Packages' },
  { id: 'topics', title: 'Topics' },
  { id: 'wikis', title: 'Wikis' },
  { id: 'marketplace', title: 'Marketplace' }
];

const SORT_OPTIONS = [
  { id: '', title: 'Best Match (default)', default: true },
  { id: 'comments-desc', title: 'Most commented' },
  { id: 'comments-asc', title: 'Least commented' },
  { id: 'created-desc', title: 'Newest first' },
  { id: 'created-asc', title: 'Oldest first' },
  { id: 'updated-desc', title: 'Recently updated' },
  { id: 'updated-asc', title: 'Least recently updated' }
];

const STATE_OPTIONS = [
  { id: '', title: '(any)', default: true },
  { id: 'open', title: 'Open' },
  { id: 'closed', title: 'Closed' }
];

const LANGUAGE_OPTIONS = [
  { id: '', title: '(any)', default: true },
  { id: 'c', title: 'C' },
  { id: 'csharp', title: 'C#' },
  { id: 'cpp', title: 'C++' },
  { id: 'coffeescript', title: 'CoffeeScript' },
  { id: 'css', title: 'CSS' },
  { id: 'dart', title: 'Dart' },
  { id: 'dm', title: 'DM' },
  { id: 'elixir', title: 'Elixir' },
  { id: 'go', title: 'Go' },
  { id: 'groovy', title: 'Groovy' },
  { id: 'html', title: 'HTML' },
  { id: 'java', title: 'Java' },
  { id: 'javascript', title: 'JavaScript' },
  { id: 'kotlin', title: 'Kotlin' },
  { id: 'objective-c', title: 'Objective-C' },
  { id: 'perl', title: 'Perl' },
  { id: 'php', title: 'PHP' },
  { id: 'powershell', title: 'PowerShell' },
  { id: 'python', title: 'Python' },
  { id: 'ruby', title: 'Ruby' },
  { id: 'rust', title: 'Rust' },
  { id: 'scala', title: 'Scala' },
  { id: 'shell', title: 'Shell' },
  { id: 'swift', title: 'Swift' },
  { id: 'typescript', title: 'TypeScript' }
];

const REGISTRY_PACKAGE_OPTIONS = [
  { id: '', title: '(any)', default: true },
  { id: 'container', title: 'Container' },
  { id: 'maven', title: 'Maven' },
  { id: 'npm', title: 'npm' },
  { id: 'rubygems', title: 'RubyGems' },
  { id: 'nuget', title: 'Nuget' }
];

const FORK_OPTIONS = [
  { id: 'no', title: 'Exclude (default)', default: true },
  { id: 'yes', title: 'Include' },
  { id: 'only', title: 'Only' }
];

const EXCLUDE_APPS = [
  'app/alithya-oss-backstage-ci',
  'app/backstage-goalie',
  'app/dependabot',
  'app/depfu',
  'app/dev-mend-for-github-com',
  'app/developer-platform-dev',
  'app/devin-ai-integration',
  'app/devpool-directory-superintendent',
  'app/forking-renovate',
  'app/github-actions',
  'app/live-github-bot',
  'app/mend-for-github-com',
  'app/renovate',
  'app/snyk-io',
  'app/staging-whitesource-for-github-com',
  'app/ubiquibot',
  'app/ubiquity-os-0x4007'
];

const SaveSearchForm = ({ defaultName, onSubmit }: { defaultName: string; onSubmit: (name: string) => false | void }) => {
  const { pop } = useNavigation();
  const [name, setName] = useState(defaultName);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            shortcut={{ modifiers: ['cmd'], key: 's' }}
            onSubmit={() => {
              if (onSubmit(name) !== false) {
                showToast({ title: 'Search Saved' });
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Search Name" storeValue placeholder="Enter name..." value={name} onChange={setName} />
    </Form>
  );
};

const toQualifier = (input: string, qualifier: string) =>
  input
    .split(/[,\s]+/)
    .map(value => `${qualifier}:${value.trim()}`)
    .join(' ');

const toQualifierQuoted = (input: string, qualifier: string) =>
  input
    .split(/,\s*/)
    .map(value => `${qualifier}:"${value.trim()}"`)
    .join(' ');

export const buildUrl = (values: FormFields, reusableFilters: ReusableFilter[]) => {
  const url = new URL('search', 'https://github.com');

  const assigneeFilter = values.assignee ? toQualifier(values.assignee, 'assignee') : '';
  const authorFilter = values.author ? toQualifier(values.author, 'author') : '';
  const commentsFilter = values.comments ? `comments:${values.comments}` : '';
  const excludeFilters = values.excludeApps ? EXCLUDE_APPS.map(app => `-author:${app}`).join(' ') : '';
  const extensionFilter = values.extension ? `path:*.${values.extension}` : '';
  const filenameFilter = values.filename ? `path:**/${values.filename}` : '';
  const forkFilter = values.fork === 'yes' ? 'fork:true' : values.fork === 'only' ? 'fork:only' : '';
  const forksFilter = values.forks ? `forks:${values.forks}` : '';
  const labelsFilter = values.labels ? toQualifierQuoted(values.labels, 'label') : '';
  const mentionsFilter = values.mentions ? toQualifier(values.mentions, 'mentions') : '';
  const ownerFilter = values.owner ? toQualifier(values.owner, 'owner') : '';
  const packageTypeFilter = values.type === 'registrypackages' && values.packageType ? `package_type:${values.packageType}` : '';
  const pathFilter = values.path ? `path:${values.path}` : '';
  const reusableFilter = (values.reusableFilterId && reusableFilters.find(f => f.id === values.reusableFilterId)?.filter) || '';
  const starFilter = values.stars ? `stars:${values.stars}` : '';
  const updatedFilter = values.updated ? `updated:<${values.updated}` : '';

  const filters = [
    assigneeFilter,
    authorFilter,
    commentsFilter,
    extensionFilter,
    filenameFilter,
    forkFilter,
    forksFilter,
    labelsFilter,
    mentionsFilter,
    ownerFilter,
    packageTypeFilter,
    pathFilter,
    starFilter,
    updatedFilter,
    reusableFilter,
    excludeFilters
  ]
    .filter(qualifier => qualifier.trim())
    .join(' ');

  url.searchParams.set('q', `${values.query} ${filters}`.trim());

  url.searchParams.set('type', values.type || '');

  if (values.state) url.searchParams.set('state', values.state);
  if (values.language) url.searchParams.set('l', values.language);
  if (values.sort) {
    const [sort, order] = values.sort.split('-');
    url.searchParams.set('s', sort);
    url.searchParams.set('o', order);
  }

  return url.toString();
};

export default function Command() {
  const { push } = useNavigation();
  const { value: savedSearches = [], setValue: setSavedSearches } = useLocalStorage<SavedSearch[]>('saved-searches', []);
  const { value: reusableFilters = [], setValue: setReusableFilters } = useLocalStorage<ReusableFilter[]>('repo-filters', []);

  const [assignee, setAssignee] = useState('');
  const [author, setAuthor] = useState('');
  const [comments, setComments] = useState('');
  const [extension, setExtension] = useState('');
  const [filename, setFilename] = useState('');
  const [filter, setFilter] = useState('code');
  const [fork, setFork] = useState('');
  const [forks, setForks] = useState('');
  const [issueState, setIssueState] = useState('');
  const [labels, setLabels] = useState('');
  const [language, setLanguage] = useState('');
  const [mentions, setMentions] = useState('');
  const [owner, setOwner] = useState('');
  const [path, setPath] = useState('');
  const [query, setQuery] = useState('');
  const [registryPackageType, setRegistryPackageType] = useState('');
  const [reusableFilterId, setReusableFilterId] = useState('');
  const [sort, setSort] = useState('');
  const [stars, setStars] = useState('');
  const [updated, setUpdated] = useState('');

  const [excludeApps, setExcludeApps] = useState(true);
  const [isReuseTab, setIsReuseTab] = useState(true);

  const [selectedSearchId, setSelectedSearchId] = useState('');

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search GitHub"
            icon={Icon.MagnifyingGlass}
            onSubmit={values => {
              const url = buildUrl(values, reusableFilters);
              if (!values.reuseTab) return open(url);
              getDefaultApplication(url).then(({ name }) => {
                if (isSupportBrowser(name)) focusOrOpenUrl(url, 'https://github.com/search', name);
                else open(url);
              });
            }}
          />

          {selectedSearchId ? (
            <>
              <Action.SubmitForm
                title="Update Saved Search"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 's' }}
                icon={Icon.Replace}
                onSubmit={formValues => {
                  const updatedSearches = savedSearches?.map(search => (search.id === selectedSearchId ? { ...search, ...formValues } : search));
                  setSavedSearches(updatedSearches ?? []);
                  showToast({ title: 'Saved search updated' });
                }}
              />

              <Action
                title="Rename Saved Search…"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
                icon={Icon.Pencil}
                onAction={() => {
                  const currentSearch = savedSearches?.find(s => s.id === selectedSearchId);
                  push(
                    <SaveSearchForm
                      defaultName={currentSearch?.name ?? ''}
                      onSubmit={name => {
                        if (!name?.trim()) {
                          showToast({ title: 'Please enter a name', style: Toast.Style.Failure });
                          return;
                        }
                        const updatedSearches = savedSearches?.map(search => (search.id === selectedSearchId ? { ...search, name } : search));
                        setSavedSearches(updatedSearches ?? []);
                        showToast({ title: 'Saved search renamed' });
                      }}
                    />
                  );
                }}
              />

              <Action
                title="Delete Saved Search"
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                onAction={() => {
                  const filteredSearches = savedSearches?.filter(search => search.id !== selectedSearchId);
                  setSavedSearches(filteredSearches ?? []);
                  setSelectedSearchId('');
                  showToast({ title: 'Saved search deleted' });
                }}
              />
            </>
          ) : (
            <Action.SubmitForm
              title="Save Search As…"
              shortcut={{ modifiers: ['cmd'], key: 's' }}
              icon={Icon.PlusCircle}
              onSubmit={async formValues => {
                push(
                  <SaveSearchForm
                    defaultName={formValues.query}
                    onSubmit={name => {
                      if (!name?.trim()) {
                        showToast({ title: 'Please enter a name', style: Toast.Style.Failure });
                        return false;
                      }
                      const savedSearch: SavedSearch = { id: Date.now().toString(), name, ...formValues };
                      setSavedSearches([...(savedSearches ?? []), savedSearch]).then(() => {
                        setTimeout(setSelectedSearchId, 100, savedSearch.id);
                        showToast({ title: 'Search saved' });
                      });
                    }}
                  />
                );
              }}
            />
          )}

          <Action
            title="Reusable Filters…"
            shortcut={{ modifiers: ['cmd'], key: 'f' }}
            icon={Icon.List}
            onAction={() => {
              push(
                <ReusableFilterForm
                  reusableFilters={reusableFilters}
                  onSelect={(filters, filterId) => {
                    setReusableFilters(filters).then(() => setTimeout(setReusableFilterId, 100, filterId));
                  }}
                  selectedFilter={reusableFilters.find(f => f.id === reusableFilterId)}
                />
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="query" title="Query" storeValue placeholder="Search" value={query} onChange={setQuery} />

      <Form.Separator />

      <Form.Dropdown
        id="savedSearches"
        title="Saved Searches"
        storeValue
        value={selectedSearchId}
        onChange={id => {
          setSelectedSearchId(id);

          if (id) {
            const search = savedSearches?.find(s => s.id === id);
            if (search) {
              setAssignee(search.assignee || '');
              setAuthor(search.author || '');
              setComments(search.comments || '');
              setExcludeApps(search.excludeApps ?? true);
              setExtension(search.extension || '');
              setFilename(search.filename || '');
              setFilter(search.type || '');
              setFork(search.fork || '');
              setForks(search.forks || '');
              setIsReuseTab(search.reuseTab ?? true);
              setIssueState(search.state || '');
              setLabels(search.labels || '');
              setLanguage(search.language || '');
              setMentions(search.mentions || '');
              setOwner(search.owner || '');
              setPath(search.path || '');
              setQuery(search.query || '');
              setRegistryPackageType(search.packageType || '');
              setReusableFilterId(search.reusableFilterId || '');
              setSort(search.sort || '');
              setStars(search.stars || '');
              setUpdated(search.updated || '');
            }
          } else {
            setAssignee('');
            setAuthor('');
            setComments('');
            setExcludeApps(true);
            setExtension('');
            setFilename('');
            setFilter('code');
            setFork('');
            setForks('');
            setIsReuseTab(true);
            setIssueState('');
            setLabels('');
            setLanguage('');
            setMentions('');
            setOwner('');
            setPath('');
            setQuery('');
            setRegistryPackageType('');
            setReusableFilterId('');
            setSort('');
            setStars('');
            setUpdated('');
          }
        }}
      >
        <Form.Dropdown.Item value="" title="Select a saved search..." />
        {savedSearches?.map(search => <Form.Dropdown.Item key={search.id} value={search.id} title={search.name} />)}
      </Form.Dropdown>

      <Form.Dropdown id="reusableFilterId" title="Reusable Filter" storeValue value={reusableFilterId} onChange={setReusableFilterId} info="Use ⌘-F to open reusable filters">
        <Form.Dropdown.Item value="" title="(none)" />
        {reusableFilters.map(reusableFilter => (
          <Form.Dropdown.Item key={reusableFilter.id} value={reusableFilter.id} title={reusableFilter.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="type" title="Category" storeValue value={filter} onChange={setFilter}>
        {FILTER_OPTIONS.map(type => (
          <Form.Dropdown.Item key={type.id} value={type.id} title={type.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="sort" title="Sort by" storeValue value={sort} onChange={setSort}>
        {SORT_OPTIONS.map(sort => (
          <Form.Dropdown.Item key={sort.id} value={sort.id} title={sort.title} />
        ))}
      </Form.Dropdown>

      {(filter === 'code' || filter === 'repositories' || filter === 'pullrequests' || filter === 'users') && (
        <Form.Dropdown id="language" title="Language" storeValue value={language} onChange={setLanguage}>
          {LANGUAGE_OPTIONS.map(lang => (
            <Form.Dropdown.Item key={lang.id} value={lang.id} title={lang.title} />
          ))}
        </Form.Dropdown>
      )}

      {filter === 'code' && (
        <>
          <Form.TextField id="extension" title="File Extension" storeValue placeholder="rb, py, jpg" value={extension} onChange={setExtension} />
          <Form.TextField id="path" title="Path" storeValue placeholder="/foo/bar/baz/qux" value={path} onChange={setPath} />
          <Form.TextField id="filename" title="File Name" storeValue placeholder="app.rb, footer.erb" value={filename} onChange={setFilename} />
        </>
      )}

      {filter === 'repositories' && (
        <Form.TextField id="owner" title="From these owners" storeValue placeholder="github, atom, electron, octokit" value={owner} onChange={setOwner} />
      )}

      {filter === 'repositories' && (
        <>
          <Form.TextField id="stars" title="With this many stars" storeValue placeholder="0..100, 200, >1000" value={stars} onChange={setStars} />
          <Form.TextField id="forks" title="With this many forks" storeValue placeholder="50..100, 200, <5" value={forks} onChange={setForks} />
        </>
      )}

      {(filter === 'issues' || filter === 'pullrequests') && (
        <>
          <Form.Dropdown id="state" title="State" storeValue value={issueState} onChange={setIssueState}>
            {STATE_OPTIONS.map(state => (
              <Form.Dropdown.Item key={state.id} value={state.id} title={state.title} />
            ))}
          </Form.Dropdown>

          <Form.TextField id="comments" title="Number of comments" storeValue placeholder="0..100, >442" value={comments} onChange={setComments} />
          <Form.TextField id="labels" title="Labels" storeValue placeholder="bug, ie6" value={labels} onChange={setLabels} />
          <Form.TextField id="author" title="Author" storeValue placeholder="hubot, octocat" value={author} onChange={setAuthor} />
          <Form.TextField id="mentions" title="Mentions" storeValue placeholder="tpope, octocat" value={mentions} onChange={setMentions} />
          <Form.TextField id="assignee" title="Assigned to the users" storeValue placeholder="twp, jim" value={assignee} onChange={setAssignee} />
          <Form.TextField id="updated" title="Updated Before" storeValue placeholder="<YYYY-MM-DD" value={updated} onChange={setUpdated} />

          <Form.Checkbox
            id="excludeApps"
            label="Exclude issues/PRs opened by apps/bots"
            storeValue
            value={excludeApps}
            onChange={setExcludeApps}
            info={`Exclude issue/PR authors from results:\n\n${EXCLUDE_APPS.join('\n')}`}
          />
        </>
      )}

      {filter === 'registrypackages' && (
        <Form.Dropdown id="packageType" title="Package Type" storeValue value={registryPackageType} onChange={setRegistryPackageType}>
          {REGISTRY_PACKAGE_OPTIONS.map(type => (
            <Form.Dropdown.Item key={type.id} value={type.id} title={type.title} />
          ))}
        </Form.Dropdown>
      )}

      {(filter === 'code' || filter === 'repositories') && (
        <Form.Dropdown id="fork" title="Forks" storeValue value={fork} onChange={setFork}>
          {FORK_OPTIONS.map(option => (
            <Form.Dropdown.Item key={option.id} value={option.id} title={option.title} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Checkbox
        id="reuseTab"
        label="Reuse open GitHub Search tab"
        value={isReuseTab}
        storeValue
        onChange={setIsReuseTab}
        info="Use browser tab that already has https://github.com/search open. Works only with Google Chrome and Safari."
      />
    </Form>
  );
}

const ReusableFilterForm = ({ reusableFilters: f, onSelect, selectedFilter }: ReusableFilterFormProps) => {
  const { pop } = useNavigation();
  const { value: reusableFilters, setValue: setReusableFilters } = useLocalStorage<ReusableFilter[]>('repo-filters', f);
  const [name, setName] = useState(selectedFilter?.name ?? '');
  const [filter, setFilter] = useState(selectedFilter?.filter ?? '');
  const [reusableFilterId, setReusableFilterId] = useState(selectedFilter?.id ?? '');

  if (!reusableFilters) return null;

  return (
    <Form
      searchBarAccessory={<Form.LinkAccessory target="https://docs.github.com/en/search-github/searching-on-github" text="Searching on GitHub" />}
      actions={
        <ActionPanel>
          {reusableFilterId ? (
            <>
              <Action.SubmitForm
                title="Select Filter"
                shortcut={Keyboard.Shortcut.Common.Open}
                icon={Icon.Checkmark}
                onSubmit={() => {
                  onSelect(reusableFilters, reusableFilterId);
                  pop();
                }}
              />
              <Action.SubmitForm
                title="Update Filter"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 's' }}
                icon={Icon.Replace}
                onSubmit={() => {
                  if (!name?.trim()) {
                    showToast({ title: 'Please enter a name', style: Toast.Style.Failure });
                    return;
                  }
                  if (!filter?.trim()) {
                    showToast({ title: 'Please enter a filter', style: Toast.Style.Failure });
                    return;
                  }
                  const filters = reusableFilters.map(f => (f.id === reusableFilterId ? { ...f, name, filter: filter.split('\n').filter(Boolean).join(' ') } : f));
                  setReusableFilters(filters).then(() => {
                    showToast({ title: 'Filter updated' });
                  });
                }}
              />
              <Action
                title="Remove Filter"
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                onAction={() => {
                  const s = reusableFilters.filter(f => f.id !== reusableFilterId);
                  setReusableFilters(s).then(() => {
                    setTimeout(setReusableFilterId, 100, '');
                    showToast({ title: 'Filter removed' });
                  });
                }}
              />
            </>
          ) : (
            <Action.SubmitForm
              title="Save Filter"
              shortcut={{ modifiers: ['cmd'], key: 's' }}
              icon={Icon.PlusCircle}
              onSubmit={() => {
                if (!name?.trim()) {
                  showToast({ title: 'Please enter a name', style: Toast.Style.Failure });
                  return;
                }
                if (!filter?.trim()) {
                  showToast({ title: 'Please enter a filter', style: Toast.Style.Failure });
                  return;
                }
                const reusableFilter: ReusableFilter = { id: Date.now().toString(), name, filter };
                const s = [...reusableFilters, reusableFilter];
                setReusableFilters(s).then(() => {
                  setTimeout(setReusableFilterId, 100, reusableFilter.id);
                  showToast({ title: 'Filter created' });
                });
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="reusableFilters"
        title="Reusable Filters"
        value={reusableFilterId}
        onChange={id => {
          if (id) {
            const reusableFilter = reusableFilters.find(f => f.id === id);
            if (reusableFilter) {
              setName(reusableFilter.name);
              setFilter(reusableFilter.filter);
            }
          } else {
            setName('');
            setFilter('');
          }
          setReusableFilterId(id);
        }}
      >
        <Form.Dropdown.Item value="" title="Create New Filter..." />
        {reusableFilters.map(filter => (
          <Form.Dropdown.Item key={filter.id} value={filter.id} title={filter.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="name" title="Name" storeValue placeholder="Enter name..." value={name} onChange={setName} />

      <Form.TextArea
        id="filter"
        title="Filter"
        storeValue
        placeholder={`repo:owner/repo
user:username
-org:organization`}
        info="Will be added to the query literally."
        value={filter}
        onChange={setFilter}
      />

      <Form.Description
        text={`Reusable filters are search qualifiers appended to the query. Example usage:\n
- Exclude organizations or repositories
- Include only certain organizations or repositories
- Add filters missing in the UI
- Use languages missing in the UI`}
      />
    </Form>
  );
};
