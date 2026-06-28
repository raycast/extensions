import { List } from '@raycast/api';

import Service, { Member } from './service';
import { getMemberStatusIcon, getToken, handleNetworkError } from './utils';
import { useCachedPromise } from '@raycast/utils';

const service = new Service(getToken());

function Command() {
  const {
    isLoading,
    data: { accounts, members },
  } = useCachedPromise(
    async () => {
      const accounts = await service.listAccounts();
      const members: Record<string, Member[]> = {};
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const accountMembers = await service.listMembers(account.id);
        members[account.id] = accountMembers;
      }
      return {
        accounts,
        members,
      };
    },
    [],
    {
      initialData: {
        accounts: [],
        members: [],
      },
      onError: handleNetworkError,
    },
  );

  return (
    <List isLoading={isLoading}>
      {Object.entries(members)
        .filter((entry) => entry[1].length > 0)
        .map((entry) => {
          const [accountId, accountMembers] = entry;
          const account = accounts.find((account) => account.id === accountId);
          const name = account?.name || '';
          return (
            <List.Section title={name} key={accountId}>
              {accountMembers.map((member) => (
                <List.Item
                  key={member.email}
                  icon={getMemberStatusIcon(member.status)}
                  title={member.email}
                  subtitle={member.role}
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

export default Command;
