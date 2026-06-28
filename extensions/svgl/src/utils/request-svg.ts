import { RequestFormValues } from "../request";

export const generateIssueURL = (form: RequestFormValues) => {
  return `https://github.com/pheralb/svgl/issues/new?assignees=&labels=request&projects=&template=request-svg.yml&title=🔔 [Request]: Add ${
    form.iconName
  } icon&svg-name=${form.iconName}&svg-url=${form.svgUrl}&svg-url-dark=${form.svgDarkUrl ?? ""}&svg-product-url=${
    form.productUrl
  }`;
};
