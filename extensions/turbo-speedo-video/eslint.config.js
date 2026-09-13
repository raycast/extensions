const raycast = require('@raycast/eslint-config');

module.exports = [...raycast, { ignores: ['src/__tests__/**'] }];
