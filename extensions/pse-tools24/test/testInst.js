const getInstrumentation = async (instance) => {
  return await fetch(
    `https://cdn.quantummetric.com/qscripts/quantum-${instance}.js`
  )
    .then((r) => r.text())
    .then((text) => {
      try {
        let top = text.match(/eula (\S+ \w{8})/)[1];
        let version = text.match(/"(\d+\.\d+\.\d+)"/)[1]
        return version+" "+top
      } catch (e) {
        console.error(e);
        return "error"
      }
    });
};