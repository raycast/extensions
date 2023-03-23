import got, { BeforeErrorHook } from 'got';

const client = got.extend({
  hooks: {},
});

export default client;
