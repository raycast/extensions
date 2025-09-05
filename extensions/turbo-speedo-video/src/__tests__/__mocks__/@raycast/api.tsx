import React from 'react';

export const getSelectedFinderItems = jest.fn();
export const showHUD = jest.fn();
export const showToast = jest.fn();
export const showInFinder = jest.fn();

export const ActionPanel = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="action-panel">{children}</div>
);

export const Action = ({
  title,
  onAction,
  icon,
}: {
  title: string;
  onAction: () => void;
  icon?: any;
}) => (
  <button data-testid="action" onClick={onAction}>
    {title}
  </button>
);

Action.OpenInBrowser = ({ url, title }: { url: string; title: string }) => (
  <button data-testid="action-open-in-browser" onClick={() => window.open(url)}>
    {title}
  </button>
);

export const Detail = ({
  markdown,
  actions,
}: {
  markdown: string;
  actions?: React.ReactNode;
}) => (
  <div data-testid="detail">
    <div dangerouslySetInnerHTML={{ __html: markdown }} />
    {actions}
  </div>
);

export const Form = ({
  children,
  isLoading,
  actions,
}: {
  children: React.ReactNode;
  isLoading: boolean;
  actions?: React.ReactNode;
}) => (
  <form data-testid="form">
    {isLoading && <div data-testid="loading">Loading...</div>}
    {children}
    {actions}
  </form>
);

Form.Description = ({ title, text }: { title: string; text: string }) => (
  <div data-testid="form-description">
    <div>{title}</div>
    <div>{text}</div>
  </div>
);

const FormDropdown = ({
  children,
  value,
  title,
  info,
  onChange,
}: {
  children: React.ReactNode;
  value: string;
  title: string;
  info: string;
  onChange: (value: string) => void;
}) => (
  <div data-testid="form-dropdown">
    <div>{title}</div>
    <div>{info}</div>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  </div>
);

FormDropdown.Item = ({
  value,
  title,
  icon,
}: {
  value: string;
  title: string;
  icon?: any;
}) => <option value={value}>{title}</option>;

Form.Dropdown = FormDropdown;

Form.TextField = ({
  value,
  onChange,
  title,
  info,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  title: string;
  info: string;
  placeholder: string;
}) => (
  <div data-testid="form-textfield">
    <div>{title}</div>
    <div>{info}</div>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

export const List = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="list">{children}</div>
);

List.EmptyView = ({
  icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div data-testid="empty-view">
    <div>{title}</div>
    <div>{description}</div>
  </div>
);

export const Icon = {
  Video: 'video',
  Clock: 'clock',
  Play: 'play',
  Folder: 'folder',
};

export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animated: 'animated',
  },
};

export const Color = {};

export interface LaunchProps {
  arguments: Record<string, any>;
  launchContext: Record<string, any>;
  launchType: string;
}

export interface FileSystemItem {
  path: string;
}
