```fortran
subroutine cggglm (
        integer n,
        integer m,
        integer p,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( * ) d,
        complex, dimension( * ) x,
        complex, dimension( * ) y,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CGGGLM solves a general Gauss-Markov linear model (GLM) problem:

minimize || y ||_2   subject to   d = A\*x + B\*y
x

where A is an N-by-M matrix, B is an N-by-P matrix, and d is a
given N-vector. It is assumed that M <= N <= M+P, and

rank(A) = M    and    rank( A B ) = N.

Under these assumptions, the constrained equation is always
consistent, and there is a unique solution x and a minimal 2-norm
solution y, which is obtained using a generalized QR factorization
of the matrices (A, B) given by

A = Q\*(R),   B = Q\*T\*Z.
(0)

In particular, if matrix B is square nonsingular, then the problem
GLM is equivalent to the following weighted linear least squares
problem

minimize || inv(B)\*(d-A\*x) ||_2
x

where inv(B) denotes the inverse of B.

Callers of this subroutine should note that the singularity/rank-deficiency checks
implemented in this subroutine are rudimentary. The CTRTRS subroutine called by this
subroutine only signals a failure due to singularity if the problem is exactly singular.

It is conceivable for one (or more) of the factors involved in the generalized QR
factorization of the pair (A, B) to be subnormally close to singularity without this
subroutine signalling an error. The solutions computed for such almost-rank-deficient
problems may be less accurate due to a loss of numerical precision.

## Parameters
N : INTEGER [in]
> The number of rows of the matrices A and B.  N >= 0.

M : INTEGER [in]
> The number of columns of the matrix A.  0 <= M <= N.

P : INTEGER [in]
> The number of columns of the matrix B.  P >= N-M.

A : COMPLEX array, dimension (LDA,M) [in,out]
> On entry, the N-by-M matrix A.
> On exit, the upper triangular part of the array A contains
> the M-by-M upper triangular matrix R.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

B : COMPLEX array, dimension (LDB,P) [in,out]
> On entry, the N-by-P matrix B.
> On exit, if N <= P, the upper triangle of the subarray
> B(1:N,P-N+1:P) contains the N-by-N upper triangular matrix T;
> if N > P, the elements on and above the (N-P)th subdiagonal
> contain the N-by-P upper trapezoidal matrix T.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

D : COMPLEX array, dimension (N) [in,out]
> On entry, D is the left hand side of the GLM equation.
> On exit, D is destroyed.

X : COMPLEX array, dimension (M) [out]

Y : COMPLEX array, dimension (P) [out]
> 
> On exit, X and Y are the solutions of the GLM problem.

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,N+M+P).
> For optimum performance, LWORK >= M+min(N,P)+max(N,P)\*NB,
> where NB is an upper bound for the optimal blocksizes for
> CGEQRF, CGERQF, CUNMQR and CUNMRQ.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> = 1:  the upper triangular factor R associated with A in the
> generalized QR factorization of the pair (A, B) is exactly
> singular, so that rank(A) < M; the least squares
> solution could not be computed.
> = 2:  the bottom (N-M) by (N-M) part of the upper trapezoidal
> factor T associated with B in the generalized QR
> factorization of the pair (A, B) is exactly singular, so that
> rank( A B ) < N; the least squares solution could not
> be computed.
