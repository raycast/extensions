```fortran
subroutine dgesvxx (
        character fact,
        character trans,
        integer n,
        integer nrhs,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        character equed,
        double precision, dimension( * ) r,
        double precision, dimension( * ) c,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( ldx , * ) x,
        integer ldx,
        double precision rcond,
        double precision rpvgrw,
        double precision, dimension( * ) berr,
        integer n_err_bnds,
        double precision, dimension( nrhs, * ) err_bnds_norm,
        double precision, dimension( nrhs, * ) err_bnds_comp,
        integer nparams,
        double precision, dimension( * ) params,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DGESVXX uses the LU factorization to compute the solution to a
double precision system of linear equations  A \* X = B,  where A is an
N-by-N matrix and X and B are N-by-NRHS matrices.

If requested, both normwise and maximum componentwise error bounds
are returned. DGESVXX will return a solution with a tiny
guaranteed error (O(eps) where eps is the working machine
precision) unless the matrix is very ill-conditioned, in which
case a warning is returned. Relevant condition numbers also are
calculated and returned.

DGESVXX accepts user-provided factorizations and equilibration
factors; see the definitions of the FACT and EQUED options.
Solving with refinement and using a factorization from a previous
DGESVXX call will also produce a solution with either O(eps)
errors or warnings, but we cannot make that claim for general
user-provided factorizations and equilibration factors if they
differ from what DGESVXX would itself produce.

## Parameters
FACT : CHARACTER\*1 [in]
> Specifies whether or not the factored form of the matrix A is
> supplied on entry, and if not, whether the matrix A should be
> equilibrated before it is factored.
> = 'F':  On entry, AF and IPIV contain the factored form of A.
> If EQUED is not 'N', the matrix A has been
> equilibrated with scaling factors given by R and C.
> A, AF, and IPIV are not modified.
> = 'N':  The matrix A will be copied to AF and factored.
> = 'E':  The matrix A will be equilibrated if necessary, then
> copied to AF and factored.

TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate Transpose = Transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right hand sides, i.e., the number of columns
> of the matrices B and X.  NRHS >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the N-by-N matrix A.  If FACT = 'F' and EQUED is
> not 'N', then A must have been equilibrated by the scaling
> factors in R and/or C.  A is not modified if FACT = 'F' or
> 'N', or if FACT = 'E' and EQUED = 'N' on exit.
> 
> On exit, if EQUED .ne. 'N', A is scaled as follows:
> EQUED = 'R':  A := diag(R) \* A
> EQUED = 'C':  A := A \* diag(C)
> EQUED = 'B':  A := diag(R) \* A \* diag(C).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : DOUBLE PRECISION array, dimension (LDAF,N) [in,out]
> If FACT = 'F', then AF is an input argument and on entry
> contains the factors L and U from the factorization
> A = P\*L\*U as computed by DGETRF.  If EQUED .ne. 'N', then
> AF is the factored form of the equilibrated matrix A.
> 
> If FACT = 'N', then AF is an output argument and on exit
> returns the factors L and U from the factorization A = P\*L\*U
> of the original matrix A.
> 
> If FACT = 'E', then AF is an output argument and on exit
> returns the factors L and U from the factorization A = P\*L\*U
> of the equilibrated matrix A (see the description of A for
> the form of the equilibrated matrix).

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in,out]
> If FACT = 'F', then IPIV is an input argument and on entry
> contains the pivot indices from the factorization A = P\*L\*U
> as computed by DGETRF; row i of the matrix was interchanged
> with row IPIV(i).
> 
> If FACT = 'N', then IPIV is an output argument and on exit
> contains the pivot indices from the factorization A = P\*L\*U
> of the original matrix A.
> 
> If FACT = 'E', then IPIV is an output argument and on exit
> contains the pivot indices from the factorization A = P\*L\*U
> of the equilibrated matrix A.

EQUED : CHARACTER\*1 [in,out]
> Specifies the form of equilibration that was done.
> = 'N':  No equilibration (always true if FACT = 'N').
> = 'R':  Row equilibration, i.e., A has been premultiplied by
> diag(R).
> = 'C':  Column equilibration, i.e., A has been postmultiplied
> by diag(C).
> = 'B':  Both row and column equilibration, i.e., A has been
> replaced by diag(R) \* A \* diag(C).
> EQUED is an input argument if FACT = 'F'; otherwise, it is an
> output argument.

R : DOUBLE PRECISION array, dimension (N) [in,out]
> The row scale factors for A.  If EQUED = 'R' or 'B', A is
> multiplied on the left by diag(R); if EQUED = 'N' or 'C', R
> is not accessed.  R is an input argument if FACT = 'F';
> otherwise, R is an output argument.  If FACT = 'F' and
> EQUED = 'R' or 'B', each element of R must be positive.
> If R is output, each element of R is a power of the radix.
> If R is input, each element of R should be a power of the radix
> to ensure a reliable solution and error estimates. Scaling by
> powers of the radix does not cause rounding errors unless the
> result underflows or overflows. Rounding errors during scaling
> lead to refining with a matrix that is not equivalent to the
> input matrix, producing error estimates that may not be
> reliable.

C : DOUBLE PRECISION array, dimension (N) [in,out]
> The column scale factors for A.  If EQUED = 'C' or 'B', A is
> multiplied on the right by diag(C); if EQUED = 'N' or 'R', C
> is not accessed.  C is an input argument if FACT = 'F';
> otherwise, C is an output argument.  If FACT = 'F' and
> EQUED = 'C' or 'B', each element of C must be positive.
> If C is output, each element of C is a power of the radix.
> If C is input, each element of C should be a power of the radix
> to ensure a reliable solution and error estimates. Scaling by
> powers of the radix does not cause rounding errors unless the
> result underflows or overflows. Rounding errors during scaling
> lead to refining with a matrix that is not equivalent to the
> input matrix, producing error estimates that may not be
> reliable.

B : DOUBLE PRECISION array, dimension (LDB,NRHS) [in,out]
> On entry, the N-by-NRHS right hand side matrix B.
> On exit,
> if EQUED = 'N', B is not modified;
> if TRANS = 'N' and EQUED = 'R' or 'B', B is overwritten by
> diag(R)\*B;
> if TRANS = 'T' or 'C' and EQUED = 'C' or 'B', B is
> overwritten by diag(C)\*B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

X : DOUBLE PRECISION array, dimension (LDX,NRHS) [out]
> If INFO = 0, the N-by-NRHS solution matrix X to the original
> system of equations.  Note that A and B are modified on exit
> if EQUED .ne. 'N', and the solution to the equilibrated system is
> inv(diag(C))\*X if TRANS = 'N' and EQUED = 'C' or 'B', or
> inv(diag(R))\*X if TRANS = 'T' or 'C' and EQUED = 'R' or 'B'.

LDX : INTEGER [in]
> The leading dimension of the array X.  LDX >= max(1,N).

RCOND : DOUBLE PRECISION [out]
> Reciprocal scaled condition number.  This is an estimate of the
> reciprocal Skeel condition number of the matrix A after
> equilibration (if done).  If this is less than the machine
> precision (in particular, if it is zero), the matrix is singular
> to working precision.  Note that the error may still be small even
> if this number is very small and the matrix appears ill-
> conditioned.

RPVGRW : DOUBLE PRECISION [out]
> Reciprocal pivot growth.  On exit, this contains the reciprocal
> pivot growth factor norm(A)/norm(U). The
> norm is used.  If this is much less than 1, then the stability of
> the LU factorization of the (equilibrated) matrix A could be poor.
> This also means that the solution X, estimated condition numbers,
> and error bounds could be unreliable. If factorization fails with
> 0<INFO<=N, then this contains the reciprocal pivot growth factor
> for the leading INFO columns of A.  In DGESVX, this quantity is
> returned in WORK(1).

BERR : DOUBLE PRECISION array, dimension (NRHS) [out]
> Componentwise relative backward error.  This is the
> componentwise relative backward error of each solution vector X(j)
> (i.e., the smallest relative change in any element of A or B that
> makes X(j) an exact solution).

N_ERR_BNDS : INTEGER [in]
> Number of error bounds to return for each right hand side
> and each type (normwise or componentwise).  See ERR_BNDS_NORM and
> ERR_BNDS_COMP below.

ERR_BNDS_NORM : DOUBLE PRECISION array, dimension (NRHS, N_ERR_BNDS) [out]
> For each right-hand side, this array contains information about
> various error bounds and condition numbers corresponding to the
> normwise relative error, which is defined as follows:
> 
> Normwise relative error in the ith solution vector:
> max_j (abs(XTRUE(j,i) - X(j,i)))
> ------------------------------
> max_j abs(X(j,i))
> 
> The array is indexed by the type of error information as described
> below. There currently are up to three pieces of information
> returned.
> 
> The first index in ERR_BNDS_NORM(i,:) corresponds to the ith
> right-hand side.
> 
> The second index in ERR_BNDS_NORM(:,err) contains the following
> three fields:
> err = 1  boolean. Trust the answer if the
> reciprocal condition number is less than the threshold
> sqrt(n) \* dlamch('Epsilon').
> 
> err = 2  error bound: The estimated forward error,
> almost certainly within a factor of 10 of the true error
> so long as the next entry is greater than the threshold
> sqrt(n) \* dlamch('Epsilon'). This error bound should only
> be trusted if the previous boolean is true.
> 
> err = 3  Reciprocal condition number: Estimated normwise
> reciprocal condition number.  Compared with the threshold
> sqrt(n) \* dlamch('Epsilon') to determine if the error
> estimate is . These reciprocal condition
> numbers are 1 / (norm(Z^{-1},inf) \* norm(Z,inf)) for some
> appropriately scaled matrix Z.
> Let Z = S\*A, where S scales each row by a power of the
> radix so all absolute row sums of Z are approximately 1.
> 
> See Lapack Working Note 165 for further details and extra
> cautions.

ERR_BNDS_COMP : DOUBLE PRECISION array, dimension (NRHS, N_ERR_BNDS) [out]
> For each right-hand side, this array contains information about
> various error bounds and condition numbers corresponding to the
> componentwise relative error, which is defined as follows:
> 
> Componentwise relative error in the ith solution vector:
> abs(XTRUE(j,i) - X(j,i))
> max_j ----------------------
> abs(X(j,i))
> 
> The array is indexed by the right-hand side i (on which the
> componentwise relative error depends), and the type of error
> information as described below. There currently are up to three
> pieces of information returned for each right-hand side. If
> componentwise accuracy is not requested (PARAMS(3) = 0.0), then
> ERR_BNDS_COMP is not accessed.  If N_ERR_BNDS < 3, then at most
> the first (:,N_ERR_BNDS) entries are returned.
> 
> The first index in ERR_BNDS_COMP(i,:) corresponds to the ith
> right-hand side.
> 
> The second index in ERR_BNDS_COMP(:,err) contains the following
> three fields:
> err = 1  boolean. Trust the answer if the
> reciprocal condition number is less than the threshold
> sqrt(n) \* dlamch('Epsilon').
> 
> err = 2  error bound: The estimated forward error,
> almost certainly within a factor of 10 of the true error
> so long as the next entry is greater than the threshold
> sqrt(n) \* dlamch('Epsilon'). This error bound should only
> be trusted if the previous boolean is true.
> 
> err = 3  Reciprocal condition number: Estimated componentwise
> reciprocal condition number.  Compared with the threshold
> sqrt(n) \* dlamch('Epsilon') to determine if the error
> estimate is . These reciprocal condition
> numbers are 1 / (norm(Z^{-1},inf) \* norm(Z,inf)) for some
> appropriately scaled matrix Z.
> Let Z = S\*(A\*diag(x)), where x is the solution for the
> current right-hand side and S scales each row of
> A\*diag(x) by a power of the radix so all absolute row
> sums of Z are approximately 1.
> 
> See Lapack Working Note 165 for further details and extra
> cautions.

NPARAMS : INTEGER [in]
> Specifies the number of parameters set in PARAMS.  If <= 0, the
> PARAMS array is never referenced and default values are used.

PARAMS : DOUBLE PRECISION array, dimension (NPARAMS) [in,out]
> Specifies algorithm parameters.  If an entry is < 0.0, then
> that entry will be filled with default value used for that
> parameter.  Only positions up to NPARAMS are accessed; defaults
> are used for higher-numbered parameters.
> 
> PARAMS(LA_LINRX_ITREF_I = 1) : Whether to perform iterative
> refinement or not.
> Default: 1.0D+0
> = 0.0:  No refinement is performed, and no error bounds are
> computed.
> = 1.0:  Use the extra-precise refinement algorithm.
> (other values are reserved for future use)
> 
> PARAMS(LA_LINRX_ITHRESH_I = 2) : Maximum number of residual
> computations allowed for refinement.
> Default: 10
> Aggressive: Set to 100 to permit convergence using approximate
> factorizations or factorizations other than LU. If
> the factorization uses a technique other than
> Gaussian elimination, the guarantees in
> err_bnds_norm and err_bnds_comp may no longer be
> trustworthy.
> 
> PARAMS(LA_LINRX_CWISE_I = 3) : Flag determining if the code
> will attempt to find a solution with small componentwise
> relative error in the double-precision algorithm.  Positive
> is true, 0.0 is false.
> Default: 1.0 (attempt componentwise convergence)

WORK : DOUBLE PRECISION array, dimension (4\*N) [out]

IWORK : INTEGER array, dimension (N) [out]

INFO : INTEGER [out]
> = 0:  Successful exit. The solution to every right-hand side is
> guaranteed.
> < 0:  If INFO = -i, the i-th argument had an illegal value
> > 0 and <= N:  U(INFO,INFO) is exactly zero.  The factorization
> has been completed, but the factor U is exactly singular, so
> the solution and error bounds could not be computed. RCOND = 0
> is returned.
> = N+J: The solution corresponding to the Jth right-hand side is
> not guaranteed. The solutions corresponding to other right-
> hand sides K with K > J may not be guaranteed as well, but
> only the first such right-hand side is reported. If a small
> componentwise error is not requested (PARAMS(3) = 0.0) then
> the Jth right-hand side is the first with a normwise error
> bound that is not guaranteed (the smallest J such
> that ERR_BNDS_NORM(J,1) = 0.0). By default (PARAMS(3) = 1.0)
> the Jth right-hand side is the first with either a normwise or
> componentwise error bound that is not guaranteed (the smallest
> J such that either ERR_BNDS_NORM(J,1) = 0.0 or
> ERR_BNDS_COMP(J,1) = 0.0). See the definition of
> ERR_BNDS_NORM(:,1) and ERR_BNDS_COMP(:,1). To get information
> about all of the right-hand sides check ERR_BNDS_NORM or
> ERR_BNDS_COMP.
