```fortran
subroutine sgsvj1 (
        character*1 jobv,
        integer m,
        integer n,
        integer n1,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( n ) d,
        real, dimension( n ) sva,
        integer mv,
        real, dimension( ldv, * ) v,
        integer ldv,
        real eps,
        real sfmin,
        real tol,
        integer nsweep,
        real, dimension( lwork ) work,
        integer lwork,
        integer info
)
```

SGSVJ1 is called from SGESVJ as a pre-processor and that is its main
purpose. It applies Jacobi rotations in the same way as SGESVJ does, but
it targets only particular pivots and it does not check convergence
(stopping criterion). Few tuning parameters (marked by [TP]) are
available for the implementer.

Further Details
~~~~~~~~~~~~~~~
SGSVJ1 applies few sweeps of Jacobi rotations in the column space of
the input M-by-N matrix A. The pivot pairs are taken from the (1,2)
off-diagonal block in the corresponding N-by-N Gram matrix A^T \* A. The
block-entries (tiles) of the (1,2) off-diagonal block are marked by the
[x]'s in the following scheme:

| \*  \*  \* [x] [x] [x]|
| \*  \*  \* [x] [x] [x]|    Row-cycling in the nblr-by-nblc [x] blocks.
| \*  \*  \* [x] [x] [x]|    Row-cyclic pivoting inside each [x] block.
|[x] [x] [x] \*  \*  \* |
|[x] [x] [x] \*  \*  \* |
|[x] [x] [x] \*  \*  \* |

In terms of the columns of A, the first N1 columns are rotated 'against'
the remaining N-N1 columns, trying to increase the angle between the
corresponding subspaces. The off-diagonal block is N1-by(N-N1) and it is
tiled using quadratic tiles of side KBL. Here, KBL is a tuning parameter.
The number of sweeps is given in NSWEEP and the orthogonality threshold
is given in TOL.

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

N1 : INTEGER [in]
> N1 specifies the 2 x 2 block partition, the first N1 columns are
> rotated 'against' the remaining N-N1 columns of A.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, M-by-N matrix A, such that A\*diag(D) represents
> the input matrix.
> On exit,
> A_onexit \* D_onexit represents the input matrix A\*diag(D)
> post-multiplied by a sequence of Jacobi rotations, where the
> rotation threshold and the total number of sweeps are given in
> TOL and NSWEEP, respectively.
> (See the descriptions of N1, D, TOL and NSWEEP.)

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

D : REAL array, dimension (N) [in,out]
> The array D accumulates the scaling factors from the fast scaled
> Jacobi rotations.
> On entry, A\*diag(D) represents the input matrix.
> On exit, A_onexit\*diag(D_onexit) represents the input matrix
> post-multiplied by a sequence of Jacobi rotations, where the
> rotation threshold and the total number of sweeps are given in
> TOL and NSWEEP, respectively.
> (See the descriptions of N1, A, TOL and NSWEEP.)

SVA : REAL array, dimension (N) [in,out]
> On entry, SVA contains the Euclidean norms of the columns of
> the matrix A\*diag(D).
> On exit, SVA contains the Euclidean norms of the columns of
> the matrix onexit\*diag(D_onexit).

MV : INTEGER [in]
> If JOBV = 'A', then MV rows of V are post-multiplied by a
> sequence of Jacobi rotations.
> If JOBV = 'N',   then MV is not referenced.

V : REAL array, dimension (LDV,N) [in,out]
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

WORK : REAL array, dimension (LWORK) [out]

LWORK : INTEGER [in]
> LWORK is the dimension of WORK. LWORK >= M.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, then the i-th argument had an illegal value
