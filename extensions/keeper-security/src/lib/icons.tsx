import React from "react";

const iconMap = {
  login: () => (
    <svg className="themed-color">
      <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6m7 1.5L18.5 9H13V3.5M12 11c1.7 0 3 1.3 3 3v1h1v4H8v-4h1v-1c0-1.6 1.3-3 3-3m0 2c-.6 0-1 .4-1 1v1h2v-1c0-.5-.4-1-1-1z" />
    </svg>
  ),
};

export const getIcon = (type: string) => {
  return iconMap[type as keyof typeof iconMap]?.() || null;
};
