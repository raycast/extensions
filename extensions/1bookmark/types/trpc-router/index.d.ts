import type { AppRouter } from './router/trpc-root-router';
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
export type { AppRouter };
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export { appRouter } from './router/trpc-root-router';
export { createTRPCContext, createCallerFactory } from './trpc';
export { loginRequest } from './service/login.service';
