const models = [
  {
    title: "GPT-4o",
    value: "gpt-4o"
  },
  {
    title: "GPT-4o mini",
    value: "gpt-4o-mini"
  },
  {
    title: "GPT-4.1",
    value: "gpt-4.1"
  },
  {
    title: "GPT-4.1 mini",
    value: "gpt-4.1-mini"
  },
  {
    title: "GPT-4.1 nano",
    value: "gpt-4.1-nano"
  },
  {
    title: "o1",
    value: "o1"
  },
  {
    title: "o1-mini",
    value: "o1-mini"
  },
  {
    title: "o1-pro",
    value: "o1-pro"
  },
  {
    title: "o3",
    value: "o3"
  },
  {
    title: "o3-mini",
    value: "o3-mini"
  },
  {
    title: "o4-mini",
    value: "o4-mini"
  }
];

const commandModels = [
  {
    title: "Follow global model",
    value: "global"
  },
  ...models
];

module.exports = {
  models,
  commandModels
}; 
