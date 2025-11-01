```fortran
subroutine cla_herfsx_extended (
        integer prec_type,
        character uplo,
        integer n,
        integer nrhs,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        logical colequ,
        real, dimension( * ) c,
        complex, dimension( ldb, * ) b,
        integer ldb,
        complex, dimension( ldy, * ) y,
        integer ldy,
        real, dimension( * ) berr_out,
        integer n_norms,
        real, dimension( nrhs, * ) err_bnds_norm,
        real, dimension( nrhs, * ) err_bnds_comp,
        complex, dimension( * ) res,
        real, dimension( * ) ayb,
        complex, dimension( * ) dy,
        complex, dimension( * ) y_tail,
        real rcond,
        integer ithresh,
        real rthresh,
        real dz_ub,
        logical ignore_cwise,
        integer info
)
```

CLA_HERFSX_EXTENDED improves the computed solution to a system of
linear equations by performing extra-precise iterative refinement
and provides error bounds and backward error estimates for the solution.
This subroutine is called by CHERFSX to perform iterative refinement.
In addition to normwise error bound, the code provides maximum
componentwise error bound if possible. See comments for ERR_BNDS_NORM
and ERR_BNDS_COMP for details of the error bounds. Note that this
subroutine is only responsible for setting the second fields of
ERR_BNDS_NORM and ERR_BNDS_COMP.

## Parameters
PREC_TYPE : INTEGER [in]
> Specifies the intermediate precision to be used in refinement.
> The value is defined by ILAPREC(P) where P is a CHARACTER and P
> = 'S':  Single
> = 'D':  Double
> = 'I':  Indigenous
> = 'X' or 'E':  Extra

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

NRHS : INTEGER [in]
> The number of right-hand-sides, i.e., the number of columns of the
> matrix B.

A : COMPLEX array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX array, dimension (LDAF,N) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by CHETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by CHETRF.

COLEQU : LOGICAL [in]
> If .TRUE. then column equilibration was done to A before calling
> this routine. This is needed to compute the solution and error
> bounds correctly.

C : REAL array, dimension (N) [in]
> The column scale factors for A. If COLEQU = .FALSE., C
> is not accessed. If C is input, each element of C should be a power
> of the radix to ensure a reliable solution and error estimates.
> Scaling by powers of the radix does not cause rounding errors unless
> the result underflows or overflows. Rounding errors during scaling
> lead to refining with a matrix that is not equivalent to the
> input matrix, producing error estimates that may not be
> reliable.

B : COMPLEX array, dimension (LDB,NRHS) [in]
> The right-hand-side matrix B.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

Y : COMPLEX array, dimension (LDY,NRHS) [in,out]
> On entry, the solution matrix X, as computed by CHETRS.
> On exit, the improved solution matrix Y.

LDY : INTEGER [in]
> The leading dimension of the array Y.  LDY >= max(1,N).

BERR_OUT : REAL array, dimension (NRHS) [out]
> On exit, BERR_OUT(j) contains the componentwise relative backward
> error for right-hand-side j from the formula
> max(i) ( abs(RES(i)) / ( abs(op(A_s))\*abs(Y) + abs(B_s) )(i) )
> where abs(Z) is the componentwise absolute value of the matrix
> or vector Z. This is computed by CLA_LIN_BERR.

N_NORMS : INTEGER [in]
> Determines which error bounds to return (see ERR_BNDS_NORM
> and ERR_BNDS_COMP).
> If N_NORMS >= 1 return normwise error bounds.
> If N_NORMS >= 2 return componentwise error bounds.

ERR_BNDS_NORM : REAL array, dimension (NRHS, N_ERR_BNDS) [in,out]
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
> sqrt(n) \* slamch('Epsilon').
> 
> err = 2  error bound: The estimated forward error,
> almost certainly within a factor of 10 of the true error
> so long as the next entry is greater than the threshold
> sqrt(n) \* slamch('Epsilon'). This error bound should only
> be trusted if the previous boolean is true.
> 
> err = 3  Reciprocal condition number: Estimated normwise
> reciprocal condition number.  Compared with the threshold
> sqrt(n) \* slamch('Epsilon') to determine if the error
> estimate is . These reciprocal condition
> numbers are 1 / (norm(Z^{-1},inf) \* norm(Z,inf)) for some
> appropriately scaled matrix Z.
> Let Z = S\*A, where S scales each row by a power of the
> radix so all absolute row sums of Z are approximately 1.
> 
> This subroutine is only responsible for setting the second field
> above.
> See Lapack Working Note 165 for further details and extra
> cautions.

ERR_BNDS_COMP : REAL array, dimension (NRHS, N_ERR_BNDS) [in,out]
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
> sqrt(n) \* slamch('Epsilon').
> 
> err = 2  error bound: The estimated forward error,
> almost certainly within a factor of 10 of the true error
> so long as the next entry is greater than the threshold
> sqrt(n) \* slamch('Epsilon'). This error bound should only
> be trusted if the previous boolean is true.
> 
> err = 3  Reciprocal condition number: Estimated componentwise
> reciprocal condition number.  Compared with the threshold
> sqrt(n) \* slamch('Epsilon') to determine if the error
> estimate is . These reciprocal condition
> numbers are 1 / (norm(Z^{-1},inf) \* norm(Z,inf)) for some
> appropriately scaled matrix Z.
> Let Z = S\*(A\*diag(x)), where x is the solution for the
> current right-hand side and S scales each row of
> A\*diag(x) by a power of the radix so all absolute row
> sums of Z are approximately 1.
> 
> This subroutine is only responsible for setting the second field
> above.
> See Lapack Working Note 165 for further details and extra
> cautions.

RES : COMPLEX array, dimension (N) [in]
> Workspace to hold the intermediate residual.

AYB : REAL array, dimension (N) [in]
> Workspace.

DY : COMPLEX array, dimension (N) [in]
> Workspace to hold the intermediate solution.

Y_TAIL : COMPLEX array, dimension (N) [in]
> Workspace to hold the trailing bits of the intermediate solution.

RCOND : REAL [in]
> Reciprocal scaled condition number.  This is an estimate of the
> reciprocal Skeel condition number of the matrix A after
> equilibration (if done).  If this is less than the machine
> precision (in particular, if it is zero), the matrix is singular
> to working precision.  Note that the error may still be small even
> if this number is very small and the matrix appears ill-
> conditioned.

ITHRESH : INTEGER [in]
> The maximum number of residual computations allowed for
> refinement. The default is 10. For 'aggressive' set to 100 to
> permit convergence using approximate factorizations or
> factorizations other than LU. If the factorization uses a
> technique other than Gaussian elimination, the guarantees in
> ERR_BNDS_NORM and ERR_BNDS_COMP may no longer be trustworthy.

RTHRESH : REAL [in]
> Determines when to stop refinement if the error estimate stops
> decreasing. Refinement will stop when the next solution no longer
> satisfies norm(dx_{i+1}) < RTHRESH \* norm(dx_i) where norm(Z) is
> the infinity norm of Z. RTHRESH satisfies 0 < RTHRESH <= 1. The
> default value is 0.5. For 'aggressive' set to 0.9 to permit
> convergence on extremely ill-conditioned matrices. See LAWN 165
> for more details.

DZ_UB : REAL [in]
> Determines when to start considering componentwise convergence.
> Componentwise convergence is only considered after each component
> of the solution Y is stable, which we define as the relative
> change in each component being less than DZ_UB. The default value
> is 0.25, requiring the first bit to be stable. See LAWN 165 for
> more details.

IGNORE_CWISE : LOGICAL [in]
> If .TRUE. then ignore componentwise convergence. Default value
> is .FALSE..

INFO : INTEGER [out]
> = 0:  Successful exit.
> < 0:  if INFO = -i, the ith argument to CLA_HERFSX_EXTENDED had an illegal
> value
