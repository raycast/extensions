export const checkIsValidURL = (url: string): boolean => {
  try {
    new URL(url);
  }
  catch (e) {
    return false
  }
  
  return true
}