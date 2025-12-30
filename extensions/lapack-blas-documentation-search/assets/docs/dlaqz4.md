```fortran
subroutine dlaqz4 (
        logical, intent(in) ilschur,
        logical, intent(in) ilq,
        logical, intent(in) ilz,
        integer, intent(in) n,
        integer, intent(in) ilo,
        integer, intent(in) ihi,
        integer, intent(in) nshifts,
        integer, intent(in) nblock_desired,
        double precision, dimension( * ), intent(inout) sr,
        double precision, dimension( * ), intent(inout) si,
        double precision, dimension( * ), intent(inout) ss,
        double precision, dimension( lda, * ), intent(inout) a,
        integer, intent(in) lda,
        double precision, dimension( ldb, * ), intent(inout) b,
        integer, intent(in) ldb,
        double precision, dimension( ldq, * ), intent(inout) q,
        integer, intent(in) ldq,
        double precision, dimension( ldz, * ), intent(inout) z,
        integer, intent(in) ldz,
        double precision, dimension( ldqc, * ), intent(inout) qc,
        integer, intent(in) ldqc,
        double precision, dimension( ldzc, * ), intent(inout) zc,
        integer, intent(in) ldzc,
        double precision, dimension( * ), intent(inout) work,
        integer, intent(in) lwork,
        integer, intent(out) info
)
```

DLAQZ4 Executes a single multishift QZ sweep

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

SR : DOUBLE PRECISION array. SR contains [in]
> the real parts of the shifts to use.

SI : DOUBLE PRECISION array. SI contains [in]
> the imaginary parts of the shifts to use.

SS : DOUBLE PRECISION array. SS contains [in]
> the scale of the shifts to use.

A : DOUBLE PRECISION array, dimension (LDA, N) [in,out]

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max( 1, N ).

B : DOUBLE PRECISION array, dimension (LDB, N) [in,out]

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max( 1, N ).

Q : DOUBLE PRECISION array, dimension (LDQ, N) [in,out]

LDQ : INTEGER [in]

Z : DOUBLE PRECISION array, dimension (LDZ, N) [in,out]

LDZ : INTEGER [in]

QC : DOUBLE PRECISION array, dimension (LDQC, NBLOCK_DESIRED) [in,out]

LDQC : INTEGER [in]

ZC : DOUBLE PRECISION array, dimension (LDZC, NBLOCK_DESIRED) [in,out]

LDZC : LDZ is INTEGER [in]

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
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
