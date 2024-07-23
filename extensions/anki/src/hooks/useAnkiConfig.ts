function useAnkiConfig() {
  // TODO: do we need this even?
  // const { ankiPath } = getPreferenceValues();

  //const dbPath = useMemo(() => `${ankiPath}/collection.anki2`, [ankiPath])
  //const query = useMemo(() => 'SELECT crt FROM col', [])

  //const { data, isLoading, error } = useSQL<AnkiCollectionData>(dbPath, query, {
  //  execute: Boolean(ankiPath),
  //  permissionPriming: "This extension requires access to the Anki database"
  //});

  // Collection creation time; due date is calculated by taking "due" values and adding to crt.
  //const crt = useMemo((): number | undefined => {
  //  if (!data || isLoading) return;

  //  if (!data.length || error) {
  //    showToast({
  //      title: 'Extension configuration error',
  //      message: 'Missing path to Anki collection',
  //    });
  //  }

  //  return data[0].crt;
  //}, [data, isLoading, error]);

  return {};
}

export default useAnkiConfig;
