module.exports = async ({ app, quickAddApi: qa }) => {
  await new Promise((resolve) => setTimeout(resolve, 6000));
  try {
    await qa.yesNoPrompt("Write the slow note?");
  } catch (error) {
    await app.vault.create("Output/Slow aborted.md", `${error.message}\n`);
    throw error;
  }
  await app.vault.create("Output/Slow.md", "written\n");
};
