```fortran
subroutine cgsvj0 (
        character*1 jobv,
        integer m,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( n ) d,
        real, dimension( n ) sva,
        integer mv,
        complex, dimension( ldv, * ) v,
        integer ldv,
        real eps,
        real sfmin,
        real tol,
        integer nsweep,
        complex, dimension( lwork ) work,
        integer lwork,
        integer info
)
```

CGSVJ0 is called from CGESVJ as a pre-processor and that is its main
purpose. It applies Jacobi rotations in the same way as CGESVJ does, but
it does not check convergence (stopping criterion). Few tuning
parameters (marked by [TP]) are available for the implementer.

## Parameters
JOBV : CHARACTER\*1 [in]
> Specifies whether the output from this procedure is used
> to compute the matrix V:
> = 'V': the product of the Jacobi rotations is accumulated
> by postmultiplying the N-by-N array V.
> (See the description of V.)
> = 'A': the product of the Jacobi rotations is accumulated
> by postmultiplying the MV-by-N array V.
> (See the descriptions of MV and V.)
> = 'N': the Jacobi rotations are not accumulated.

M : INTEGER [in]
> The number of rows of the input matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the input matrix A.
> M >= N >= 0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, M-by-N matrix A, such that A\*diag(D) represents
> the input matrix.
> On exit,
> A_onexit \* diag(D_onexit) represents the input matrix A\*diag(D)
> post-multiplied by a sequence of Jacobi rotations, where the
> rotation threshold and the total number of sweeps are given in
> TOL and NSWEEP, respectively.
> (See the descriptions of D, TOL and NSWEEP.)

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

D : COMPLEX array, dimension (N) [in,out]
> The array D accumulates the scaling factors from the complex scaled
> Jacobi rotations.
> On entry, A\*diag(D) represents the input matrix.
> On exit, A_onexit\*diag(D_onexit) represents the input matrix
> post-multiplied by a sequence of Jacobi rotations, where the
> rotation threshold and the total number of sweeps are given in
> TOL and NSWEEP, respectively.
> (See the descriptions of A, TOL and NSWEEP.)

SVA : REAL array, dimension (N) [in,out]
> On entry, SVA contains the Euclidean norms of the columns of
> the matrix A\*diag(D).
> On exit, SVA contains the Euclidean norms of the columns of
> the matrix A_onexit\*diag(D_onexit).

MV : INTEGER [in]
> If JOBV = 'A', then MV rows of V are post-multiplied by a
> sequence of Jacobi rotations.
> If JOBV = 'N',   then MV is not referenced.

V : COMPLEX array, dimension (LDV,N) [in,out]
> If JOBV = 'V' then N rows of V are post-multiplied by a
> sequence of Jacobi rotations.
> If JOBV = 'A' then MV rows of V are post-multiplied by a
> sequence of Jacobi rotations.
> If JOBV = 'N',   then V is not referenced.

LDV : INTEGER [in]
> The leading dimension of the array V,  LDV >= 1.
> If JOBV = 'V', LDV >= N.
> If JOBV = 'A', LDV >= MV.

EPS : REAL [in]
> EPS = SLAMCH('Epsilon')

SFMIN : REAL [in]
> SFMIN = SLAMCH('Safe Minimum')

TOL : REAL [in]
> TOL is the threshold for Jacobi rotations. For a pair
> A(:,p), A(:,q) of pivot columns, the Jacobi rotation is
> applied only if ABS(COS(angle(A(:,p),A(:,q)))) > TOL.

NSWEEP : INTEGER [in]
> NSWEEP is the number of sweeps of Jacobi rotations to be
> performed.

WORK : COMPLEX array, dimension (LWORK) [out]

LWORK : INTEGER [in]
> LWORK is the dimension of WORK. LWORK >= M.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, then the i-th argument had an illegal value
