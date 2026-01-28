/** the type that represents the submitted form values */
export interface FormEntry {
  /** Domain name of a website without subdomains (e.g: google.com). */
  domain: string;
  /** Size of the icon in pixels (px). This must be of type `string` in order to be compatible with react
   * Therefore, this must be validated more rigorously.
   */
  size: string;
}

/** the type that represents the properties that can be passed to `AddSearchedEntry` */
export interface EntryProps {
  /** This function is called when the user submitted the form.This function to be passed to this field must be the `setValue` function in `useLocalStorage` in order to
   *  add an entry to `LocalStorage`.
   */
  addToHistory: (entry: FormEntry) => void;
}
