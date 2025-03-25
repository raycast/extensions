import React from "react";

// Create a component for List
const ListComponent = ({ children, isLoading }: { children: React.ReactNode; isLoading?: boolean }) => (
  <div data-testid="list" role="list" aria-busy={isLoading}>
    {children}
  </div>
);

// Add Item as a property
ListComponent.Item = ({ children, title, subtitle, accessories, actions }: any) => (
  <div 
    data-testid="list-item" 
    data-title={title}
    data-subtitle={subtitle}
  >
    {children}
    {accessories?.map((acc: any, i: number) => (
      <span key={i} data-testid="accessory">{acc.text}</span>
    ))}
    <div data-testid="title">{title}</div>
    {subtitle && <div data-testid="subtitle">{subtitle}</div>}
    {actions}
  </div>
);

// Add Section as a property
ListComponent.Section = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <div data-testid="list-section" data-title={title}>
    {title && <div data-testid="section-title">{title}</div>}
    {children}
  </div>
);

ListComponent.Dropdown = {
  Item: ({ title }: { title: string }) => <div>{title}</div>
};

export const List = ListComponent;

export const ActionPanel = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="action-panel">{children}</div>
);

// Create a component for Action
const ActionComponent = ({ title, onAction, icon, style }: any) => (
  <button 
    role="button"
    onClick={onAction} 
    title={title} 
    data-icon={icon} 
    data-style={style}
  >
    {title}
  </button>
);

// Add properties to ActionComponent
ActionComponent.Style = {
  Regular: 'regular',
  Destructive: 'destructive'
};

ActionComponent.OpenInBrowser = ({ title, onAction }: { title: string; onAction: () => void }) => (
  <button onClick={onAction} title={title}>{title}</button>
);

ActionComponent.SubmitForm = ({ title, onSubmit }: { title: string; onSubmit: (values: any) => void }) => (
  <button 
    type="submit"
    onClick={(e) => {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        const inputs = form.querySelectorAll('input');
        const values = Array.from(inputs).reduce((acc, input) => ({
          ...acc,
          [input.name]: input.value
        }), {});
        onSubmit(values);
      }
    }} 
    title={title}
  >
    {title}
  </button>
);

export const Action = ActionComponent;

// Create Form component
const FormComponent = ({ children, actions, onSubmit }: { children: React.ReactNode; actions: React.ReactNode; onSubmit?: (values: any) => void }) => (
  <form 
    data-testid="form" 
    onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const values = Object.fromEntries(formData.entries());
      onSubmit?.(values);
    }}
  >
    {children}
    {actions}
  </form>
);

// Add TextField as a property
FormComponent.TextField = ({ id, title, placeholder, value, onChange }: any) => (
  <input 
    name={id}
    data-testid={id} 
    placeholder={placeholder} 
    title={title}
    value={value}
    onChange={onChange}
  />
);

export const Form = FormComponent;

export const Icon = {
  XMarkCircle: "xmark-circle",
  LineChart: "line-chart",
  Network: "network",
  Circle: "circle",
  Globe: "globe",
  ArrowClockwise: "arrow-clockwise",
  Stop: "stop",
  Play: "play",
  Trash: "trash",
  Plus: "plus",
  CheckCircle: "check-circle"
};

export const Color = {
  Red: "red",
  Orange: "orange",
  Yellow: "yellow",
  Purple: "purple",
  Blue: "blue",
  Green: "green"
};

export const showToast = jest.fn();
export const confirmAlert = jest.fn().mockResolvedValue(true);

export const Toast = {
  Style: {
    Failure: 'failure',
    Success: 'success',
    Animated: 'animated'
  }
}; 