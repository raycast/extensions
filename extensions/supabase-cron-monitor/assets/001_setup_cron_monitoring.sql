-- Migration: Setup pg_cron monitoring for Supabase Cloud
-- This creates wrapper views and functions in the public schema
-- to expose pg_cron data via PostgREST API
--
-- PROJECT: your-project-ref.supabase.co
-- Run this in SQL Editor on Supabase Dashboard
-- =============================================================================

-- =============================================================================
-- 1. First, ensure pg_cron extension is enabled (usually pre-enabled on Pro plans)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- =============================================================================
-- 2. Create wrapper views in public schema to expose cron tables
-- =============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.cron_job CASCADE;
DROP VIEW IF EXISTS public.cron_job_run_details CASCADE;

-- View for cron.job table
-- Maps to the app's expected CronJob model structure
CREATE VIEW public.cron_job AS
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job;

-- View for cron.job_run_details table
-- Maps to the app's expected JobRunDetail model structure
-- Includes jobname via JOIN with cron.job
CREATE VIEW public.cron_job_run_details AS
SELECT 
    rd.runid,
    rd.jobid,
    j.jobname,  -- Added via JOIN for app compatibility
    rd.job_pid,
    rd.database,
    rd.username,
    rd.command,
    rd.status,
    rd.return_message,
    rd.start_time,
    rd.end_time
FROM cron.job_run_details rd
JOIN cron.job j ON rd.jobid = j.jobid;

-- =============================================================================
-- 3. Grant permissions to service_role (bypasses RLS)
-- =============================================================================

GRANT SELECT ON public.cron_job TO service_role;
GRANT SELECT ON public.cron_job_run_details TO service_role;

-- Also grant to anon for read-only access (optional, remove if not needed)
-- GRANT SELECT ON public.cron_job TO anon;
-- GRANT SELECT ON public.cron_job_run_details TO anon;

-- =============================================================================
-- 4. Create RPC functions for flexible querying (alternative approach)
-- =============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.list_cron_jobs();
DROP FUNCTION IF EXISTS public.get_cron_job_runs(text, integer);
DROP FUNCTION IF EXISTS public.get_last_job_run(text);

-- Function to list all cron jobs
CREATE FUNCTION public.list_cron_jobs()
RETURNS TABLE (
    jobid bigint,
    jobname text,
    schedule text,
    command text,
    nodename text,
    nodeport integer,
    database text,
    username text,
    active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, cron, public
AS $$
    SELECT jobid, jobname, schedule, command, nodename, nodeport, database, username, active
    FROM cron.job
    ORDER BY jobname;
$$;

-- Function to get job run details with optional filtering
CREATE FUNCTION public.get_cron_job_runs(p_jobname text DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS TABLE (
    runid bigint,
    jobid bigint,
    job_pid integer,
    database text,
    username text,
    command text,
    status text,
    return_message text,
    start_time timestamptz,
    end_time timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, cron, public
AS $$
    SELECT rd.runid, rd.jobid, rd.job_pid, rd.database, rd.username, 
           rd.command, rd.status, rd.return_message, rd.start_time, rd.end_time
    FROM cron.job_run_details rd
    JOIN cron.job j ON rd.jobid = j.jobid
    WHERE (p_jobname IS NULL OR j.jobname = p_jobname)
    ORDER BY rd.start_time DESC
    LIMIT p_limit;
$$;

-- Function to get the last run for a specific job
CREATE FUNCTION public.get_last_job_run(p_jobname text)
RETURNS TABLE (
    runid bigint,
    jobid bigint,
    job_pid integer,
    database text,
    username text,
    command text,
    status text,
    return_message text,
    start_time timestamptz,
    end_time timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, cron, public
AS $$
    SELECT rd.runid, rd.jobid, rd.job_pid, rd.database, rd.username, 
           rd.command, rd.status, rd.return_message, rd.start_time, rd.end_time
    FROM cron.job_run_details rd
    JOIN cron.job j ON rd.jobid = j.jobid
    WHERE j.jobname = p_jobname
    ORDER BY rd.start_time DESC
    LIMIT 1;
$$;

-- =============================================================================
-- 5. Grant execute permissions on functions
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.list_cron_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_job_runs(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_last_job_run(text) TO service_role;

-- =============================================================================
-- 6. Expose public schema via PostgREST (if not already)
-- =============================================================================
-- Note: On Supabase Cloud, the public schema is exposed by default.
-- If you need to add the cron wrapper views to the API, they will be
-- available at:
--   GET /rest/v1/cron_job
--   GET /rest/v1/cron_job_run_details
-- Or via RPC:
--   POST /rest/v1/rpc/list_cron_jobs
--   POST /rest/v1/rpc/get_cron_job_runs
--   POST /rest/v1/rpc/get_last_job_run

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- After running this migration, verify with:
-- 
-- SELECT * FROM public.cron_job;
-- SELECT * FROM public.cron_job_run_details LIMIT 10;
-- SELECT * FROM public.list_cron_jobs();
-- SELECT * FROM public.get_cron_job_runs(NULL, 10);
--
-- =============================================================================

-- =============================================================================
-- SAMPLE TEST CRON JOB (optional - for testing)
-- =============================================================================
-- Create a simple test job that runs every minute:
-- SELECT cron.schedule('test-heartbeat', '* * * * *', 'SELECT 1');
-- 
-- To remove:
-- SELECT cron.unschedule('test-heartbeat');
-- =============================================================================
