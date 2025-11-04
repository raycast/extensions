```fortran
recursive subroutine claqz2 (
        logical, intent(in) ilschur,
        logical, intent(in) ilq,
        logical, intent(in) ilz,
        integer, intent(in) n,
        integer, intent(in) ilo,
        integer, intent(in) ihi,
        integer, intent(in) nw,
        complex, dimension( lda, * ), intent(inout) a,
        integer, intent(in) lda,
        complex, dimension( ldb, * ), intent(inout) b,
        integer, intent(in) ldb,
        complex, dimension( ldq, * ), intent(inout) q,
        integer, intent(in) ldq,
        complex, dimension( ldz, * ), intent(inout) z,
        integer, intent(in) ldz,
        integer, intent(out) ns,
        integer, intent(out) nd,
        complex, dimension( * ), intent(inout) alpha,
        complex, dimension( * ), intent(inout) beta,
        complex, dimension( ldqc, * ) qc,
        integer, intent(in) ldqc,
        complex, dimension( ldzc, * ) zc,
        integer, intent(in) ldzc,
        complex, dimension( * ) work,
        integer, intent(in) lwork,
        real, dimension( * ) rwork,
        integer, intent(in) rec,
        integer, intent(out) info
)
```

CLAQZ2 performs AED

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
> ILO and IHI mark the rows and columns of (A,B) which
> are to be normalized

NW : INTEGER [in]
> The desired size of the deflation window.

A : COMPLEX array, dimension (LDA, N) [in,out]

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max( 1, N ).

B : COMPLEX array, dimension (LDB, N) [in,out]

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max( 1, N ).

Q : COMPLEX array, dimension (LDQ, N) [in,out]

LDQ : INTEGER [in]

Z : COMPLEX array, dimension (LDZ, N) [in,out]

LDZ : INTEGER [in]

NS : INTEGER [out]
> The number of unconverged eigenvalues available to
> use as shifts.

ND : INTEGER [out]
> The number of converged eigenvalues found.

ALPHA : COMPLEX array, dimension (N) [out]
> Each scalar alpha defining an eigenvalue
> of GNEP.

BETA : COMPLEX array, dimension (N) [out]
> The scalars beta that define the eigenvalues of GNEP.
> Together, the quantities alpha = ALPHA(j) and
> beta = BETA(j) represent the j-th eigenvalue of the matrix
> pair (A,B), in one of the forms lambda = alpha/beta or
> mu = beta/alpha.  Since either lambda or mu may overflow,
> they should not, in general, be computed.

QC : COMPLEX array, dimension (LDQC, NW) [in,out]

LDQC : INTEGER [in]

ZC : COMPLEX array, dimension (LDZC, NW) [in,out]

LDZC : LDZ is INTEGER [in]

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO >= 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.  LWORK >= max(1,N).
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

RWORK : REAL array, dimension (N) [out]

REC : INTEGER [in]
> REC indicates the current recursion level. Should be set
> to 0 on first call.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
