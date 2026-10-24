module.exports = (vars) => ({
  expectJson: JSON.stringify(vars?.expect ?? {}, null, 2),
});
