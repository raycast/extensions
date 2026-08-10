```fortran
subroutine sgelsd (
        integer m,
        integer n,
        integer nrhs,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( ldb, * ) b,
        integer ldb,
        real, dimension( * ) s,
        real rcond,
        integer rank,
        real, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer info
)
```

SGELSD computes the minimum-norm solution to a real linear least
squares problem:
minimize 2-norm(| b - A\*x |)
using the singular value decomposition (SVD) of A. A is an M-by-N
matrix which may be rank-deficient.

Several right hand side vectors b and solution vectors x can be
handled in a single call; they are stored as the columns of the
M-by-NRHS right hand side matrix B and the N-by-NRHS solution
matrix X.

The problem is solved in three steps:
(1) Reduce the coefficient matrix A to bidiagonal form with
Householder transformations, reducing the original problem
into a  (BLS)
(2) Solve the BLS using a divide and conquer approach.
(3) Apply back all the Householder transformations to solve
the original least squares problem.

The effective rank of A is determined by treating as zero those
singular values which are less than RCOND times the largest singular
value.

## Parameters
M : INTEGER [in]
> The number of rows of A. M >= 0.

N : INTEGER [in]
> The number of columns of A. N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X. NRHS >= 0.

A : REAL array, dimension (LDA,N) [in,out]
> On entry, the M-by-N matrix A.
> On exit, A has been destroyed.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

B : REAL array, dimension (LDB,NRHS) [in,out]
> On entry, the M-by-NRHS right hand side matrix B.
> On exit, B is overwritten by the N-by-NRHS solution
> matrix X.  If m >= n and RANK = n, the residual
> sum-of-squares for the solution in the i-th column is given
> by the sum of squares of elements n+1:m in that column.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,max(M,N)).

S : REAL array, dimension (min(M,N)) [out]
> The singular values of A in decreasing order.
> The condition number of A in the 2-norm = S(1)/S(min(m,n)).

RCOND : REAL [in]
> RCOND is used to determine the effective rank of A.
> Singular values S(i) <= RCOND\*S(1) are treated as zero.
> If RCOND < 0, machine precision is used instead.

RANK : INTEGER [out]
> The effective rank of A, i.e., the number of singular values
> which are greater than RCOND\*S(1).

WORK : REAL array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK must be at least 1.
> The exact minimum amount of workspace needed depends on M,
> N and NRHS. As long as LWORK is at least
> 12\*N + 2\*N\*SMLSIZ + 8\*N\*NLVL + N\*NRHS + (SMLSIZ+1)\*\*2,
> if M is greater than or equal to N or
> 12\*M + 2\*M\*SMLSIZ + 8\*M\*NLVL + M\*NRHS + (SMLSIZ+1)\*\*2,
> if M is less than N, the code will execute correctly.
> SMLSIZ is returned by ILAENV and is equal to the maximum
> size of the subproblems at the bottom of the computation
> tree (usually about 25), and
> NLVL = MAX( 0, INT( LOG_2( MIN( M,N )/(SMLSIZ+1) ) ) + 1 )
> For good performance, LWORK should generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the array WORK and the
> minimum size of the array IWORK, and returns these values as
> the first entries of the WORK and IWORK arrays, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> LIWORK >= max(1, 3\*MINMN\*NLVL + 11\*MINMN),
> where MINMN = MIN( M,N ).
> On exit, if INFO = 0, IWORK(1) returns the minimum LIWORK.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  the algorithm for computing the SVD failed to converge;
> if INFO = i, i off-diagonal elements of an intermediate
> bidiagonal form did not converge to zero.
