import eslint_config from '@zhsama/eslint-config'

export default eslint_config({
  indent: 2, // default 4
  ts: true, // default false
  ignores: ['scripts/**'],
  rules: {

    // custom rules
    curly: ['error'],
  },
})
