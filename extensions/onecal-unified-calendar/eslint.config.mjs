import raycastConfig from '@raycast/eslint-config';

// @raycast/eslint-configはネストした配列を含みESLint 9がそのままでは受け付けないため深く平坦化する
export default [raycastConfig].flat(Infinity);
