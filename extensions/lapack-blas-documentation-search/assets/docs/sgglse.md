```fortran
subroutine sgglse (
        integer m,
        integer n,
        integer p,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) c,
        real, dimension( * ) d,
        real, dimension( * ) x,
        real, dimension( * ) work,
        integer lwork,
        integer info
)
```

SGGLSE solves the linear equality-constrained least squares (LSE)
problem:

minimize || c - A\*x ||_2   subject to   B\*x = d

where A is an M-by-N matrix, B is a P-by-N matrix, c is a given
M-vector, and d is a given P-vector. It is assumed that
P <= N <= M+P, and

rank(B) = P and  rank( (A) ) = N.
( (B) )

These conditions ensure that the LSE problem has a unique solution,
which is obtained using a generalized RQ factorization of the
matrices (B, A) given by

B = (0 R)\*Q,   A = Z\*T\*Q.

Callers of this subroutine should note that the singularity/rank-deficiency checks
implemented in this subroutine are rudimentary. The STRTRS subroutine called by this
subroutine only signals a failure due to singularity if the problem is exactly singular.

It is conceivable for one (or more) of the factors involved in the generalized RQ
factorization of the pair (B, A) to be subnormally close to singularity without this
subroutine signalling an error. The solutions computed for such almost-rank-deficient
problems may be less accurate due to a loss of numerical precision.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrices A and B. N >= 0.

P : INTEGER [in]
> The number of rows of the matrix B. 0 <= P <= N <= M+P.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, the elements on and above the diagonal of the array
> contain the min(M,N)-by-N upper trapezoidal matrix T.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

B : REAL array, dimension (LDB,N) [in,out]
> On entry, the P-by-N matrix B.
> On exit, the upper triangle of the subarray B(1:P,N-P+1:N)
> contains the P-by-P upper triangular matrix R.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,P).

C : REAL array, dimension (M) [in,out]
> On entry, C contains the right hand side vector for the
> least squares part of the LSE problem.
> On exit, the residual sum of squares for the solution
> is given by the sum of squares of elements N-P+1 to M of
> vector C.

D : REAL array, dimension (P) [in,out]
> On entry, D contains the right hand side vector for the
> constrained equation.
> On exit, D is destroyed.

X : REAL array, dimension (N) [out]
> On exit, X is the solution of the LSE problem.

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,M+N+P).
> For optimum performance LWORK >= P+min(M,N)+max(M,N)\*NB,
> where NB is an upper bound for the optimal blocksizes for
> SGEQRF, SGERQF, SORMQR and SORMRQ.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> = 1:  the upper triangular factor R associated with B in the
> generalized RQ factorization of the pair (B, A) is exactly
> singular, so that rank(B) < P; the least squares
> solution could not be computed.
> = 2:  the (N-P) by (N-P) part of the upper trapezoidal factor
> T associated with A in the generalized RQ factorization
> of the pair (B, A) is exactly singular, so that
> rank( (A) ) < N; the least squares solution could not
> ( (B) )
> be computed.
