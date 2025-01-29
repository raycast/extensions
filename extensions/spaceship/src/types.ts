export type DomainInfo = {
name: string;
unicodeName: string;
isPremium: boolean;
autoRenew: boolean;
registrationDate: string;
expirationDate: string;
privacyProtection: {
level: "public" | "high";
contactForm: boolean;
},
}

export type PaginatedResult<T> = {
    items: T[];
    total: number;
}
export type ErrorResult = { detail: string; data?: Array<{ field: string; details: string }> }