export const LocalStorage = {
	setItem: jest.fn(),
	getItem: jest.fn(),
	removeItem: jest.fn(),
	allItems: jest.fn(),
};

export const confirmAlert = jest.fn();
export const showToast = jest.fn();
export const Alert = { ActionStyle: { Destructive: "destructive" } };
export const Toast = { Style: { Success: "success", Failure: "failure", Animated: "animated" } };
