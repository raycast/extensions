```fortran
subroutine slaqz4 (
        logical, intent(in) ilschur,
        logical, intent(in) ilq,
        logical, intent(in) ilz,
        integer, intent(in) n,
        integer, intent(in) ilo,
        integer, intent(in) ihi,
        integer, intent(in) nshifts,
        integer, intent(in) nblock_desired,
        real, dimension( * ), intent(inout) sr,
        real, dimension( * ), intent(inout) si,
        real, dimension( * ), intent(inout) ss,
        real, dimension( lda, * ), intent(inout) a,
        integer, intent(in) lda,
        real, dimension( ldb, * ), intent(inout) b,
        integer, intent(in) ldb,
        real, dimension( ldq, * ), intent(inout) q,
        integer, intent(in) ldq,
        real, dimension( ldz, * ), intent(inout) z,
        integer, intent(in) ldz,
        real, dimension( ldqc, * ), intent(inout) qc,
        integer, intent(in) ldqc,
        real, dimension( ldzc, * ), intent(inout) zc,
        integer, intent(in) ldzc,
        real, dimension( * ), intent(inout) work,
        integer, intent(in) lwork,
        integer, intent(out) info
)
```

SLAQZ4 Executes a single multishift QZ sweep

## Parameters
ILSCHUR : LOGICAL [in]
> Determines whether or not to update the full Schur form

ILQ : LOGICAL [in]
> Determines whether or not to update the matrix Q

ILZ : LOGICAL [in]
> Determines whether or not to update the matrix Z

N : INTEGER [in]
> The order of the matrices A, B, Q, and Z.  N >= 0.

ILO : INTEGER [in]

IHI : INTEGER [in]

NSHIFTS : INTEGER [in]
> The desired number of shifts to use

NBLOCK_DESIRED : INTEGER [in]
> The desired size of the computational windows

SR : REAL array. SR contains [in]
> the real parts of the shifts to use.

SI : REAL array. SI contains [in]
> the imaginary parts of the shifts to use.

SS : REAL array. SS contains [in]
> the scale of the shifts to use.

A : REAL array, dimension (LDA, N) [in,out]

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max( 1, N ).

B : REAL array, dimension (LDB, N) [in,out]

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max( 1, N ).

Q : REAL array, dimension (LDQ, N) [in,out]

LDQ : INTEGER [in]

Z : REAL array, dimension (LDZ, N) [in,out]

LDZ : INTEGER [in]

QC : REAL array, dimension (LDQC, NBLOCK_DESIRED) [in,out]

LDQC : INTEGER [in]

ZC : REAL array, dimension (LDZC, NBLOCK_DESIRED) [in,out]

LDZC : LDZ is INTEGER [in]

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO >= 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,N).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
