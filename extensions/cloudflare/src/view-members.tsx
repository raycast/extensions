import { List } from '@raycast/api';
import { useEffect, useState } from 'react';

import Service, { Member } from './service';
import {
  getMemberStatusIcon,
  getEmail,
  getKey,
  handleNetworkError,
} from './utils';

const service = new Service(getEmail(), getKey());

function Command() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const accounts = await service.listAccounts();
        if (accounts.length === 0) {
          setMembers([]);
          setLoading(false);
        }
        const account = accounts[0];

        const members = await service.listMembers(account.id);
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
      {members.map((member) => (
        <List.Item
          key={member.email}
          icon={getMemberStatusIcon(member.status)}
          title={member.email}
          subtitle={member.role}
        />
      ))}
    </List>
  );
}

export default Command;
