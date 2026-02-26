import React from 'react';

// Other imports

const aiChat = () => {
    // Other code...

    // Action.CopyToClipboard items
    const actions = [
        // Copy Answer (Cmd+C)
        {
            title: 'Copy Answer',
            shortcut: 'cmd+c',
            callback: () => { /* Copy Answer logic */ }
        },
        // Copy Prompt (Cmd+Shift+C)
        {
            title: 'Copy Prompt',
            shortcut: 'cmd+shift+c',
            callback: () => { /* Copy Prompt logic */ }
        }
    ];

    // Other code...
};

export default aiChat;
