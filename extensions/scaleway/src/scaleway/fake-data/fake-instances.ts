import { Instance, InstanceState } from '../types'

export const fakeInstances: Instance[] = [
  {
    id: 'b278d403-c1c5-47b0-a15a-add214192fdc',
    name: 'mattermost',
    arch: 'x86_64',
    commercial_type: 'DEV1-S',
    image: {
      id: 'b6c478da-a82b-48d8-95e7-4c7f97b28ab7',
      name: 'Ubuntu 22.04 Jammy Jellyfish',
    },
    tags: ['team', 'chat'],
    state: InstanceState.STOPPED,
    public_ip: {
      address: '121.34.57.89',
    },
    security_group: {
      id: 'daa0c022-7cee-455a-85a1-aadc6b766aa8',
      name: 'Default security group',
    },
    allowed_actions: ['poweron'],
    zone: 'fr-par-2',
  },
  {
    id: '780d8899-dd31-453e-b784-0a95702c10a9',
    name: 'nextcloud',
    arch: 'x86_64',
    commercial_type: 'GP1-M',
    image: {
      id: '2bff7a90-91f8-4110-99c6-2b4453024699',
      name: 'Ubuntu 20.04 Focal Fossa',
    },
    tags: ['cloud'],
    state: InstanceState.RUNNING,
    public_ip: {
      address: '34.103.230.2',
    },
    security_group: {
      id: '3c92c480-c5e4-44a5-8b1e-e0e18fefc234',
      name: 'Default security group',
    },
    allowed_actions: ['poweroff', 'reboot'],
    zone: 'pl-waw-1',
  },
]
