type AnyObject = Record<string, any>;

declare const GIT_INFO: any;

interface Document {
  querySelector(selectors: string): any;
  querySelectorAll(selectors: string): any;
  getElementById(elementId: string): any;
}

interface Navigator {
  standalone?: boolean;
}
