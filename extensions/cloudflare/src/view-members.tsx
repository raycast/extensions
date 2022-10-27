import { List } from '@raycast/api';
import { useEffect, useState } from 'react';

import Service, { Account, Member } from './service';
import { getMemberStatusIcon, getToken, handleNetworkError } from './utils';

const service = new Service(getToken());

function Command() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const accounts = await service.listAccounts();
        setAccounts(accounts);

        const members: Record<string, Member[]> = {};
        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i];
          const accountMembers = await service.listMembers(account.id);
          members[account.id] = accountMembers;
        }
        setMembers(members);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchMembers();
  }, []);

  return (
    <List isLoading={isLoading}>
      {Object.entries(members)
        .filter((entry) => entry[1].length > 0)
        .map((entry) => {
          const [accountId, accountMembers] = entry;
          const account = accounts.find((account) => account.id === accountId);
          const name = account?.name || '';
          return (
            <List.Section title={name}>
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
